import { useState, useEffect } from 'react';
import { Save, ChevronLeft, ChevronRight, Upload, FileText, Video, Image, FileIcon, X, Eye } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { MultiSelect } from '../common/MultiSelect';
import { Select } from '../common/Select';
import { Textarea } from '../common/Textarea';
import { useTheme } from '../../contexts/ThemeContext';
import { trainingService } from '../../services/trainingService';
import { CreateTitleModal } from './CreateTitleModal';

export function UnifiedTrainingModal({ isOpen, onClose, session, onSave, initialTab = 0, isMatchDay = false }) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [contents, setContents] = useState([]);
  const [stages, setStages] = useState([]);
  const [titles, setTitles] = useState([]);
  const [showCreateTitle, setShowCreateTitle] = useState(false);
  const [blockData, setBlockData] = useState({});
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [existingFiles, setExistingFiles] = useState([]);
  const [previewFile, setPreviewFile] = useState(null);

  // Tab navigation: Blocos de treino apenas (sem tab de Anexos)
  const [activeTab, setActiveTab] = useState(0);
  const [attachmentTitleInput, setAttachmentTitleInput] = useState('');
  const [showTitlePrompt, setShowTitlePrompt] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);

  // Para dias de jogo, mostrar apenas o primeiro bloco como "Não relacionados"
  const tabs = isMatchDay && session?.blocks?.length > 0
    ? [{
        id: 0,
        label: 'Não relacionados',
        blockId: session.blocks[0].id,
      }]
    : (session?.blocks || []).map((block, index) => ({
        id: index,
        label: block.name,
        blockId: block.id,
      }));

  useEffect(() => {
    if (isOpen) {
      // initialTab now directly refers to the block index (0-based)
      setActiveTab(Math.max(0, initialTab));
      loadData();
    } else {
      // Reset state when modal closes
      setBlockData({});
      setUploadedFiles([]);
      setExistingFiles([]);
      setContents([]);
      setStages([]);
      setTitles([]);
      setActiveTab(0);
      setPreviewFile(null);
      setAttachmentTitleInput('');
      setShowTitlePrompt(false);
      setPendingFile(null);
    }
  }, [isOpen, initialTab, session]);

  async function loadData() {
    setIsLoadingData(true);
    try {
      const [contentsData, stagesData, titlesData, filesData] = await Promise.all([
        trainingService.getContents(),
        trainingService.getStages(),
        trainingService.getTitles(),
        session?.id ? trainingService.getSessionFiles(session.id) : Promise.resolve([]),
      ]);

      const loadedContents = contentsData || [];
      const loadedStages = stagesData || [];
      const loadedTitles = Array.isArray(titlesData) ? titlesData : titlesData?.data || [];
      const loadedFiles = filesData || [];

      setContents(loadedContents);
      setStages(loadedStages);
      setTitles(loadedTitles);
      setExistingFiles(loadedFiles);

      // Initialize block data with existing activity data
      const initialData = {};
      session?.blocks?.forEach((block) => {
        const activity = block?.activity;

        if (activity) {
          // Map saved stage_names to stage IDs
          const stageIds = activity.stages
            ?.map(activityStage => {
              const globalStage = loadedStages.find(s => s.name === activityStage.stage_name);
              return globalStage?.id;
            })
            .filter(id => id) || [];

          initialData[block.id] = {
            selectedContents: activity.contents?.map((c) => c.id) || [],
            selectedStages: stageIds,
            titleId: activity.title_id || '',
            description: activity.description || '',
            selectedGroups: activity.groups || [],
            durationMinutes: activity.duration_minutes || '',
          };
        } else {
          // Empty data for blocks without activity
          initialData[block.id] = {
            selectedContents: [],
            selectedStages: [],
            titleId: '',
            description: '',
            selectedGroups: [],
            durationMinutes: '',
          };
        }
      });
      setBlockData(initialData);
    } catch (error) {
      console.error('Error loading data:', error);
      setContents([]);
      setStages([]);
      setTitles([]);
    } finally {
      setIsLoadingData(false);
    }
  }

  const handleFieldChange = (blockId, field, value) => {
    setBlockData((prev) => {
      const updated = {
        ...prev,
        [blockId]: { ...(prev[blockId] || {}), [field]: value },
      };

      // Se mudou os conteúdos, limpar o tema selecionado se ele não for compatível
      if (field === 'selectedContents') {
        const currentTitleId = updated[blockId].titleId;
        if (currentTitleId) {
          const selectedTitle = titles.find(t => t.id === currentTitleId);
          // Se o tema tem um conteúdo e não está na lista de conteúdos selecionados, limpar
          if (selectedTitle?.content_id && !value.includes(selectedTitle.content_id)) {
            updated[blockId].titleId = '';
          }
        }
        // Limpar etapas selecionadas quando conteúdo mudar
        updated[blockId].selectedStages = [];
      }

      return updated;
    });
  };

  // Função para filtrar etapas baseadas nos conteúdos selecionados
  const getAvailableStages = (blockId) => {
    const blockInfo = blockData[blockId];
    if (!blockInfo || !blockInfo.selectedContents || blockInfo.selectedContents.length === 0) {
      return []; // Não mostrar etapas se não houver conteúdo selecionado
    }

    const selectedContentNames = blockInfo.selectedContents.map(contentId => {
      const content = contents.find(c => c.id === contentId);
      return content?.name;
    }).filter(Boolean);

    // Filtrar etapas que pertencem aos conteúdos selecionados
    const filteredStages = stages.filter(stage => {
      return selectedContentNames.includes(stage.content_name);
    });

    // Remover duplicatas baseadas no nome da etapa (para BP Ofensiva e Defensiva)
    const uniqueStages = [];
    const seenNames = new Set();

    filteredStages.forEach(stage => {
      if (!seenNames.has(stage.name)) {
        seenNames.add(stage.name);
        uniqueStages.push(stage);
      }
    });

    return uniqueStages;
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);

    // Process one file at a time, prompting for title
    if (files.length > 0) {
      const file = files[0];
      setPendingFile(file);
      setShowTitlePrompt(true);
    }
  };

  const confirmFileWithTitle = () => {
    if (!attachmentTitleInput.trim()) {
      alert('Por favor, insira um título para o anexo.');
      return;
    }

    if (!pendingFile) return;

    // Check if we already have 5 files
    const totalFiles = existingFiles.length + uploadedFiles.length;
    if (totalFiles >= 5) {
      alert('Máximo de 5 anexos atingido.');
      setShowTitlePrompt(false);
      setPendingFile(null);
      setAttachmentTitleInput('');
      return;
    }

    const newFile = {
      id: Math.random().toString(36).substr(2, 9),
      file: pendingFile,
      title: attachmentTitleInput.trim(),
      name: pendingFile.name,
      size: pendingFile.size,
      type: pendingFile.type,
      url: URL.createObjectURL(pendingFile),
    };

    setUploadedFiles([...uploadedFiles, newFile]);
    setShowTitlePrompt(false);
    setPendingFile(null);
    setAttachmentTitleInput('');
  };

  const cancelFileUpload = () => {
    setShowTitlePrompt(false);
    setPendingFile(null);
    setAttachmentTitleInput('');
  };

  const handleRemoveFile = async (fileId, isExisting = false) => {
    if (isExisting) {
      // Delete from server
      if (window.confirm('Tem certeza que deseja excluir este arquivo? Esta ação não pode ser desfeita.')) {
        try {
          await trainingService.deleteSessionFile(fileId);
          setExistingFiles(existingFiles.filter((f) => f.id !== fileId));
        } catch (error) {
          console.error('Error deleting file:', error);
          alert('Erro ao excluir arquivo: ' + error.message);
        }
      }
    } else {
      // Remove from local state only
      const file = uploadedFiles.find(f => f.id === fileId);
      if (file?.url) {
        URL.revokeObjectURL(file.url);
      }
      setUploadedFiles(uploadedFiles.filter((f) => f.id !== fileId));
    }
  };

  const handlePreviewFile = (file) => {
    // Normalize file object for preview
    const normalizedFile = {
      id: file.id,
      name: file.name || file.file_name,
      url: file.url,
      type: file.type || file.mime_type,
      size: file.size || file.file_size,
    };
    setPreviewFile(normalizedFile);
  };

  const handleSave = async () => {
    // Check if session date is in the past
    if (session?.date) {
      const sessionDate = new Date(session.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      sessionDate.setHours(0, 0, 0, 0);

      if (sessionDate < today) {
        const confirmed = window.confirm(
          'Você está alterando um treino de uma data passada.\n\n' +
          'Esta alteração pode indicar que o treino foi realizado de forma diferente do planejado.\n\n' +
          'Deseja continuar?'
        );

        if (!confirmed) {
          return; // Cancel save
        }
      }
    }

    setLoading(true);
    try {
      await onSave({ blockData, files: uploadedFiles });
      onClose();
    } catch (error) {
      console.error('Error saving:', error);
      alert('Erro ao salvar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTitleCreated = async (newTitle) => {
    const titlesData = await trainingService.getTitles();
    setTitles(Array.isArray(titlesData) ? titlesData : titlesData?.data || []);
    setShowCreateTitle(false);
  };

  const goToPreviousTab = () => {
    if (activeTab > 0) {
      setActiveTab(activeTab - 1);
    }
  };

  const goToNextTab = () => {
    if (activeTab < tabs.length - 1) {
      setActiveTab(activeTab + 1);
    }
  };

  const getFileIcon = (type) => {
    if (type.startsWith('video/')) return Video;
    if (type.startsWith('image/')) return Image;
    if (type.includes('pdf')) return FileText;
    return FileIcon;
  };

  // Filtrar temas baseado nos conteúdos selecionados
  const getFilteredTitles = (blockId) => {
    const selectedContents = blockData[blockId]?.selectedContents || [];

    // Se nenhum conteúdo selecionado, retornar array vazio (não mostrar temas)
    if (selectedContents.length === 0) {
      return [];
    }

    // Filtrar temas que pertencem aos conteúdos selecionados
    return titles.filter(title =>
      title.content_id && selectedContents.includes(title.content_id)
    );
  };

  const groupOptions = [
    { value: 'G1', label: 'Grupo 1' },
    { value: 'G2', label: 'Grupo 2' },
    { value: 'G3', label: 'Grupo 3' },
    { value: 'Transição', label: 'Transição' },
    // DM não aparece nas opções para marcar em atividades
  ];

  // Não precisa mais filtrar - apenas os 6 conteúdos corretos existem no DB

  // Styles
  const tabContainerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    borderBottom: `2px solid ${colors.border}`,
    marginBottom: '1rem',
    padding: '0 0.5rem',
  };

  const tabButtonStyle = (isActive) => ({
    padding: '0.5rem 1rem',
    border: 'none',
    background: isActive ? colors.primary : 'transparent',
    color: isActive ? '#fff' : colors.text,
    cursor: 'pointer',
    borderRadius: '0.375rem 0.375rem 0 0',
    fontWeight: isActive ? '600' : '500',
    fontSize: '0.875rem',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
    opacity: isActive ? 1 : 0.7,
  });

  const navButtonStyle = (disabled) => ({
    padding: '0.4rem',
    border: `1px solid ${colors.border}`,
    background: colors.background,
    color: colors.text,
    cursor: disabled ? 'not-allowed' : 'pointer',
    borderRadius: '0.375rem',
    display: 'flex',
    alignItems: 'center',
    opacity: disabled ? 0.4 : 1,
  });

  const contentAreaStyle = {
    maxHeight: 'calc(100vh - 280px)',
    overflowY: 'auto',
    overflowX: 'visible',
    padding: '0.5rem',
  };

  const uploadAreaStyle = {
    border: `2px dashed ${colors.border}`,
    borderRadius: '0.5rem',
    padding: '1.5rem',
    textAlign: 'center',
    cursor: 'pointer',
    backgroundColor: colors.background,
    transition: 'all 0.2s',
  };

  const fileGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '1rem',
    marginTop: '1.5rem',
  };

  const fileCardStyle = {
    position: 'relative',
    padding: '1rem',
    backgroundColor: colors.background,
    borderRadius: '0.5rem',
    border: `1px solid ${colors.border}`,
    cursor: 'pointer',
    transition: 'all 0.2s',
  };

  const blockFormStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    padding: '0.5rem',
  };

  const previewOverlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: '2rem',
  };

  const previewContentStyle = {
    maxWidth: '90vw',
    maxHeight: '90vh',
    backgroundColor: colors.background,
    borderRadius: '0.5rem',
    padding: '1rem',
    position: 'relative',
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Treino - ${session?.day_name} (${session?.date ? new Date(session.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : ''})`}
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading} icon={<Save size={18} />}>
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </>
        }
      >
        {isLoadingData ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: colors.textSecondary }}>
            Carregando dados...
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '1rem', height: '100%' }}>
            {/* Main Content Area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              {/* Tab Navigation */}
              <div style={tabContainerStyle}>
                <button
                  onClick={goToPreviousTab}
                  disabled={activeTab === 0}
                  style={navButtonStyle(activeTab === 0)}
                >
                  <ChevronLeft size={20} />
                </button>

                <div style={{ display: 'flex', gap: '0.25rem', flex: 1, overflowX: 'auto' }}>
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      style={tabButtonStyle(activeTab === tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={goToNextTab}
                  disabled={activeTab === tabs.length - 1}
                  style={navButtonStyle(activeTab === tabs.length - 1)}
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              {/* Tab Content */}
              <div style={contentAreaStyle}>
                {/* Block Form - renderiza o bloco atual */}
                {(() => {
                  const block = session?.blocks?.[activeTab];
                  if (!block) return null;

                  return (
                    <div style={blockFormStyle}>
                      {/* Linha 1: Conteúdos e Etapas lado a lado */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <MultiSelect
                          label="Conteúdos"
                          options={contents.map((c) => ({ value: c.id, label: c.name }))}
                          value={blockData[block.id]?.selectedContents || []}
                          onChange={(value) => handleFieldChange(block.id, 'selectedContents', value)}
                          placeholder="Selecione conteúdos..."
                        />

                        <MultiSelect
                          label="Etapas"
                          options={getAvailableStages(block.id).map((s) => ({ value: s.id, label: s.name }))}
                          value={blockData[block.id]?.selectedStages || []}
                          onChange={(value) => handleFieldChange(block.id, 'selectedStages', value)}
                          placeholder={blockData[block.id]?.selectedContents?.length > 0 ? "Selecione etapas..." : "Selecione conteúdos primeiro..."}
                          disabled={!blockData[block.id]?.selectedContents?.length}
                        />
                      </div>

                      {/* Linha 2: Tema, Grupo e Tempo */}
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                          <div style={{ flex: 1 }}>
                            <Select
                              label="Tema da Atividade"
                              fullWidth
                              options={getFilteredTitles(block.id).map((t) => ({ value: t.id, label: t.title }))}
                              value={blockData[block.id]?.titleId || ''}
                              onChange={(e) => handleFieldChange(block.id, 'titleId', e.target.value)}
                              placeholder={blockData[block.id]?.selectedContents?.length > 0 ? "Selecione um tema..." : "Selecione conteúdos primeiro..."}
                            />
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setShowCreateTitle(true)}
                          >
                            Novo
                          </Button>
                        </div>
                        <MultiSelect
                          label="Grupos"
                          options={groupOptions}
                          value={blockData[block.id]?.selectedGroups || []}
                          onChange={(value) => handleFieldChange(block.id, 'selectedGroups', value)}
                          placeholder="Selecione grupos..."
                        />
                        <div>
                          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: colors.text }}>
                            Tempo (minutos)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={blockData[block.id]?.durationMinutes || ''}
                            onChange={(e) => handleFieldChange(block.id, 'durationMinutes', e.target.value)}
                            placeholder="Ex: 30"
                            style={{
                              width: '100%',
                              padding: '0.5rem 0.75rem',
                              fontSize: '0.875rem',
                              border: `1px solid ${colors.border}`,
                              borderRadius: '0.375rem',
                              backgroundColor: colors.background,
                              color: colors.text,
                            }}
                          />
                        </div>
                      </div>

                      {/* Linha 3: Descrição */}
                      <Textarea
                        label="Descrição"
                        fullWidth
                        rows={4}
                        value={blockData[block.id]?.description || ''}
                        onChange={(e) => handleFieldChange(block.id, 'description', e.target.value)}
                        placeholder="Adicione uma descrição sobre esta atividade..."
                      />
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Sidebar - Attachments (6 slots) */}
            <div style={{
              width: '250px',
              borderLeft: `1px solid ${colors.border}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              padding: '1rem',
              backgroundColor: colors.surface,
              flexShrink: 0,
            }}>
              {(() => {
                const totalFiles = existingFiles.length + uploadedFiles.length;

                return (
                  <>
                    <div style={{
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: colors.text,
                      marginBottom: '0.25rem',
                    }}>
                      Anexos da Sessão ({totalFiles}/5)
                    </div>

                    {/* File Upload Button */}
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem',
                      backgroundColor: totalFiles < 5 ? colors.primary : colors.surfaceHover,
                      color: totalFiles < 5 ? '#ffffff' : colors.textMuted,
                      borderRadius: '0.375rem',
                      cursor: totalFiles < 5 ? 'pointer' : 'not-allowed',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      transition: 'all 0.2s',
                      opacity: totalFiles < 5 ? 1 : 0.5,
                    }}>
                      <Upload size={18} />
                      Adicionar Anexo
                      <input
                        type="file"
                        onChange={handleFileUpload}
                        disabled={totalFiles >= 5}
                        style={{ display: 'none' }}
                        accept="image/*,video/*,.pdf"
                      />
                    </label>
                  </>
                );
              })()}

              {/* File Slots */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1, overflow: 'visible' }}>
                {(() => {
                  const allFiles = [...existingFiles, ...uploadedFiles];
                  const totalFiles = allFiles.length;
                  const slots = Array.from({ length: 5 }, (_, i) => {
                    const file = allFiles[i];
                    return { index: i, file };
                  });

                  return slots.map(({ index, file }) => (
                    <div
                      key={index}
                      style={{
                        border: `1px solid ${colors.border}`,
                        borderRadius: '0.25rem',
                        padding: '0.3rem',
                        backgroundColor: file ? colors.background : colors.surfaceHover,
                        minHeight: '52px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.15rem',
                        position: 'relative',
                      }}
                    >
                      {file ? (
                        <>
                          {/* File Title */}
                          <div style={{
                            fontSize: '0.65rem',
                            fontWeight: '600',
                            color: colors.text,
                            marginBottom: '0.1rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {file.title}
                          </div>

                          {/* File Thumbnail/Icon */}
                          <div style={{
                            height: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: colors.surface,
                            borderRadius: '0.2rem',
                            overflow: 'hidden',
                          }}>
                            {file.type?.startsWith('image/') || file.mime_type?.startsWith('image/') ? (
                              <img
                                src={file.url}
                                alt={file.title}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                }}
                              />
                            ) : file.type?.startsWith('video/') || file.mime_type?.startsWith('video/') ? (
                              <Video size={16} color={colors.textMuted} />
                            ) : (
                              <FileText size={16} color={colors.textMuted} />
                            )}
                          </div>

                          {/* File Actions */}
                          <div style={{ display: 'flex', gap: '0.2rem', marginTop: '0.1rem' }}>
                            <button
                              onClick={() => handlePreviewFile(file)}
                              style={{
                                flex: 1,
                                padding: '0.15rem 0.25rem',
                                backgroundColor: colors.primary,
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '0.2rem',
                                cursor: 'pointer',
                                fontSize: '0.6rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.15rem',
                              }}
                            >
                              <Eye size={10} />
                              Ver
                            </button>
                            <button
                              onClick={() => handleRemoveFile(file.id, !!file.file_path)}
                              style={{
                                flex: 1,
                                padding: '0.15rem 0.25rem',
                                backgroundColor: colors.danger || '#ef4444',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '0.2rem',
                                cursor: 'pointer',
                                fontSize: '0.6rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.15rem',
                              }}
                            >
                              <X size={10} />
                              Excluir
                            </button>
                          </div>
                        </>
                      ) : (
                        <div style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: colors.textMuted,
                          fontSize: '0.65rem',
                        }}>
                          Slot {index + 1}
                        </div>
                      )}
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Title Prompt Modal */}
      {showTitlePrompt && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
        }}>
          <div style={{
            backgroundColor: colors.background,
            padding: '1.5rem',
            borderRadius: '0.5rem',
            width: '400px',
            maxWidth: '90%',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: colors.text, fontSize: '1.1rem' }}>
              Título do Anexo
            </h3>
            <input
              type="text"
              value={attachmentTitleInput}
              onChange={(e) => setAttachmentTitleInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && confirmFileWithTitle()}
              placeholder="Digite o título do anexo..."
              autoFocus
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '0.875rem',
                border: `1px solid ${colors.border}`,
                borderRadius: '0.375rem',
                backgroundColor: colors.surface,
                color: colors.text,
                marginBottom: '1rem',
              }}
            />
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={cancelFileUpload}>
                Cancelar
              </Button>
              <Button onClick={confirmFileWithTitle}>
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}


      {/* File Preview Modal */}
      {previewFile && (
        <div style={previewOverlayStyle} onClick={() => setPreviewFile(null)}>
          <div style={previewContentStyle} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewFile(null)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: colors.danger || '#ef4444',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 1,
              }}
            >
              <X size={20} />
            </button>

            <div style={{ marginBottom: '1rem', fontWeight: '600', color: colors.text }}>
              {previewFile.name}
            </div>

            {previewFile.type.startsWith('image/') && (
              <img
                src={previewFile.url}
                alt={previewFile.name}
                style={{ maxWidth: '100%', maxHeight: 'calc(90vh - 100px)', objectFit: 'contain' }}
              />
            )}

            {previewFile.type.startsWith('video/') && (
              <video
                src={previewFile.url}
                controls
                style={{ maxWidth: '100%', maxHeight: 'calc(90vh - 100px)' }}
              />
            )}

            {previewFile.type.includes('pdf') && (
              <iframe
                src={previewFile.url}
                style={{ width: '80vw', height: 'calc(90vh - 100px)', border: 'none' }}
                title={previewFile.name}
              />
            )}
          </div>
        </div>
      )}

      <CreateTitleModal
        isOpen={showCreateTitle}
        onClose={() => setShowCreateTitle(false)}
        onSave={handleTitleCreated}
      />
    </>
  );
}
