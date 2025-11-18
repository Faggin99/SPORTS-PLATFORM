import { useState, useEffect } from 'react';
import { Save, Plus, Upload, FileText, Video, X } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { MultiSelect } from '../common/MultiSelect';
import { Select } from '../common/Select';
import { Textarea } from '../common/Textarea';
import { useTheme } from '../../contexts/ThemeContext';
import { trainingService } from '../../services/trainingService';
import { CreateTitleModal } from './CreateTitleModal';

export function SessionModal({ isOpen, onClose, session, onSave }) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [contents, setContents] = useState([]);
  const [stages, setStages] = useState([]);
  const [titles, setTitles] = useState([]);
  const [showCreateTitle, setShowCreateTitle] = useState(false);
  const [blockData, setBlockData] = useState({});
  const [uploadedFiles, setUploadedFiles] = useState([]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    } else {
      // Reset state when modal closes
      setBlockData({});
      setUploadedFiles([]);
      setContents([]);
      setStages([]);
      setTitles([]);
    }
  }, [isOpen]);

  async function loadData() {
    setIsLoadingData(true);
    try {
      const [contentsData, stagesData, titlesData] = await Promise.all([
        trainingService.getContents(),
        trainingService.getStages(),
        trainingService.getTitles(),
      ]);

      const loadedContents = contentsData || [];
      const loadedStages = stagesData || [];
      const loadedTitles = Array.isArray(titlesData) ? titlesData : titlesData?.data || [];

      setContents(loadedContents);
      setStages(loadedStages);
      setTitles(loadedTitles);

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
            group: activity.groups?.[0] || '',
          };
        } else {
          // Empty data for blocks without activity
          initialData[block.id] = {
            selectedContents: [],
            selectedStages: [],
            titleId: '',
            description: '',
            group: '',
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
    setBlockData((prev) => ({
      ...prev,
      [blockId]: { ...(prev[blockId] || {}), [field]: value },
    }));
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const newFiles = files.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
    }));
    setUploadedFiles([...uploadedFiles, ...newFiles]);
  };

  const handleRemoveFile = (fileId) => {
    setUploadedFiles(uploadedFiles.filter((f) => f.id !== fileId));
  };

  const handleSave = async () => {
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

  const sectionStyle = {
    marginBottom: '2rem',
    paddingBottom: '1.5rem',
    borderBottom: `1px solid ${colors.border}`,
  };

  const sectionTitleStyle = {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: colors.text,
    marginBottom: '1rem',
  };

  const blockContainerStyle = {
    marginBottom: '2rem',
    padding: '1rem',
    backgroundColor: `${colors.primary}05`,
    borderRadius: '0.5rem',
    border: `1px solid ${colors.border}`,
  };

  const blockHeaderStyle = {
    fontSize: '1rem',
    fontWeight: '600',
    color: colors.primary,
    marginBottom: '1rem',
  };

  const uploadAreaStyle = {
    border: `2px dashed ${colors.border}`,
    borderRadius: '0.5rem',
    padding: '2rem',
    textAlign: 'center',
    cursor: 'pointer',
    backgroundColor: colors.background,
    transition: 'all 0.2s',
  };

  const fileListStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    marginTop: '1rem',
  };

  const fileItemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem',
    backgroundColor: colors.background,
    borderRadius: '0.375rem',
    border: `1px solid ${colors.border}`,
  };

  const groupOptions = [
    { value: '', label: 'Todos' },
    { value: 'G1', label: 'Grupo 1' },
    { value: 'G2', label: 'Grupo 2' },
    { value: 'G3', label: 'Grupo 3' },
    { value: 'Transição', label: 'Transição' },
  ];

  // Filter out "Descanso" from contents
  const filteredContents = contents.filter((c) => c.name !== 'Descanso');

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Treino - ${session?.day_name}`}
        size="full"
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
          <div style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', padding: '0.5rem' }}>
            {/* File Upload Section */}
            <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Arquivos e Vídeos</div>
            <input
              type="file"
              id="file-upload"
              multiple
              accept="video/*,.pdf,.doc,.docx"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <label htmlFor="file-upload" style={uploadAreaStyle}>
              <Upload size={32} style={{ color: colors.primary, margin: '0 auto 0.5rem' }} />
              <div style={{ color: colors.text, fontWeight: '500' }}>
                Clique para fazer upload ou arraste arquivos
              </div>
              <div style={{ color: colors.textSecondary, fontSize: '0.875rem', marginTop: '0.5rem' }}>
                Suporta vídeos, PDFs e documentos
              </div>
            </label>

            {uploadedFiles.length > 0 && (
              <div style={fileListStyle}>
                {uploadedFiles.map((file) => (
                  <div key={file.id} style={fileItemStyle}>
                    {file.type.startsWith('video/') ? (
                      <Video size={20} style={{ color: colors.primary }} />
                    ) : (
                      <FileText size={20} style={{ color: colors.primary }} />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: '500', color: colors.text }}>
                        {file.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: colors.textSecondary }}>
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<X size={16} />}
                      onClick={() => handleRemoveFile(file.id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Training Blocks Section */}
          <div style={sectionTitleStyle}>Atividades do Treino</div>
          {session?.blocks?.map((block) => (
            <div key={block.id} style={blockContainerStyle}>
              <div style={blockHeaderStyle}>{block.name}</div>

              <div style={{ display: 'grid', gap: '1rem' }}>
                <MultiSelect
                  label="Conteúdos"
                  options={filteredContents.map((c) => ({ value: c.id, label: c.name }))}
                  value={blockData[block.id]?.selectedContents || []}
                  onChange={(value) => handleFieldChange(block.id, 'selectedContents', value)}
                  placeholder="Selecione conteúdos..."
                />

                <MultiSelect
                  label="Etapas"
                  options={stages.map((s) => ({ value: s.id, label: s.name }))}
                  value={blockData[block.id]?.selectedStages || []}
                  onChange={(value) => handleFieldChange(block.id, 'selectedStages', value)}
                  placeholder="Selecione etapas..."
                />

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <Select
                        label="Título da Atividade"
                        fullWidth
                        options={titles.map((t) => ({ value: t.id, label: t.title }))}
                        value={blockData[block.id]?.titleId || ''}
                        onChange={(e) => handleFieldChange(block.id, 'titleId', e.target.value)}
                        placeholder="Selecione um título..."
                      />
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Plus size={16} />}
                      onClick={() => setShowCreateTitle(true)}
                    >
                      Novo
                    </Button>
                  </div>
                  <Select
                    label="Grupo"
                    fullWidth
                    options={groupOptions}
                    value={blockData[block.id]?.group || ''}
                    onChange={(e) => handleFieldChange(block.id, 'group', e.target.value)}
                    placeholder="Selecione..."
                  />
                </div>

                <Textarea
                  label="Descrição / Observações"
                  fullWidth
                  rows={3}
                  value={blockData[block.id]?.description || ''}
                  onChange={(e) => handleFieldChange(block.id, 'description', e.target.value)}
                  placeholder="Adicione observações sobre esta atividade..."
                />
              </div>
            </div>
          ))}
          </div>
        )}
      </Modal>

      <CreateTitleModal
        isOpen={showCreateTitle}
        onClose={() => setShowCreateTitle(false)}
        onSave={handleTitleCreated}
      />
    </>
  );
}
