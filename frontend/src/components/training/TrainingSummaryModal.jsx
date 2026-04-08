import { useRef } from 'react';
import { X, FileDown } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import html2pdf from 'html2pdf.js';

export function TrainingSummaryModal({ isOpen, onClose, session }) {
  const { colors } = useTheme();
  const contentRef = useRef(null);

  if (!isOpen || !session) return null;

  const getTotalDuration = () => {
    if (!session?.blocks) return 0;
    return session.blocks.reduce((total, block) => {
      const duration = block.activity?.duration_minutes || 0;
      return total + parseInt(duration || 0);
    }, 0);
  };

  // Filter blocks with activities
  const activeBlocks = session.blocks?.filter(block => block.activity) || [];

  const handleDownloadPDF = async () => {
    try {
      const element = contentRef.current;
      if (!element) return;

      // Hide buttons
      const buttons = document.querySelectorAll('.no-print');
      buttons.forEach(btn => btn.style.display = 'none');

      // Configuração do PDF com margens simétricas
      const opt = {
        margin: 15, // Margem única para todos os lados
        filename: `treino-${session.day_name}-${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`,
        image: { type: 'jpeg', quality: 0.85 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          letterRendering: true,
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait',
          compress: true
        },
        pagebreak: { mode: 'avoid-all', avoid: '.avoid-break' }
      };

      await html2pdf().set(opt).from(element).save();

      // Show buttons again
      buttons.forEach(btn => btn.style.display = '');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Erro ao gerar PDF. Por favor, tente novamente.');
    }
  };

  // Styles
  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: '1rem',
  };

  const modalStyle = {
    backgroundColor: '#f5f5f5',
    borderRadius: '0.5rem',
    width: '210mm',
    height: '95vh',
    maxWidth: '95vw',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
    position: 'relative',
    overflow: 'hidden',
  };

  const headerStyle = {
    position: 'absolute',
    top: '0.75rem',
    right: '0.75rem',
    display: 'flex',
    gap: '0.5rem',
    zIndex: 10,
  };

  const buttonStyle = {
    padding: '0.5rem',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    border: '1px solid #ddd',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#333',
    transition: 'all 0.2s',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  };

  const scrollContainerStyle = {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    display: 'flex',
    justifyContent: 'center',
    padding: '1rem',
  };

  const pageStyle = {
    width: '180mm', // Largura do conteúdo (210mm - 30mm de margem)
    backgroundColor: '#ffffff',
    color: '#000000',
    padding: '10mm 15mm 15mm 15mm', // Reduzido padding-top de 15mm para 10mm
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  };

  const titleStyle = {
    fontSize: '24px',
    fontWeight: '700',
    marginBottom: '4px',
    color: '#1a1a1a',
    textAlign: 'center',
    borderBottom: '3px solid #2563eb',
    paddingBottom: '8px',
  };

  const subtitleStyle = {
    fontSize: '13px',
    fontWeight: '500',
    color: '#666',
    textAlign: 'center',
    marginBottom: '12px',
  };

  const blockContainerStyle = {
    marginBottom: '8px',
    border: '2px solid #d1d5db',
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  };

  const blockTitleRowStyle = {
    fontSize: '13px',
    fontWeight: '700',
    color: '#ffffff',
    backgroundColor: '#3b82f6',
    padding: '8px 12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const durationBadgeStyle = {
    backgroundColor: '#1e40af',
    color: '#ffffff',
    padding: '3px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
  };

  const twoColumnsStyle = {
    display: 'flex',
    gap: '12px',
    padding: '10px 12px',
    backgroundColor: '#f9fafb',
  };

  const leftColumnStyle = {
    flex: 1,
    paddingRight: '12px',
    borderRight: '2px solid #d1d5db',
  };

  const rightColumnStyle = {
    flex: 1,
    paddingLeft: '12px',
  };

  const singleColumnStyle = {
    flex: 1,
  };

  const fieldRowStyle = {
    marginBottom: '6px',
    fontSize: '11px',
    color: '#374151',
    lineHeight: '1.6',
    wordWrap: 'break-word',
  };

  const labelStyle = {
    fontWeight: '700',
    color: '#1f2937',
    display: 'inline-block',
    minWidth: '75px',
  };

  const valueStyle = {
    color: '#4b5563',
  };

  const observationsStyle = {
    fontSize: '11px',
    color: '#374151',
    whiteSpace: 'pre-wrap',
    lineHeight: '1.6',
    wordWrap: 'break-word',
  };

  const observationsTitleStyle = {
    fontWeight: '700',
    marginBottom: '6px',
    color: '#1f2937',
    fontSize: '11px',
  };

  const totalDurationBoxStyle = {
    backgroundColor: '#f0f9ff',
    border: '2px solid #2563eb',
    borderRadius: '8px',
    padding: '10px',
    textAlign: 'center',
    marginTop: '15px',
    fontSize: '15px',
    fontWeight: '700',
    color: '#1e40af',
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {/* Action Buttons */}
        <div style={headerStyle} className="no-print">
          <button
            onClick={handleDownloadPDF}
            style={buttonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#dbeafe';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
            title="Baixar PDF"
          >
            <FileDown size={22} strokeWidth={1.5} />
          </button>
          <button
            onClick={onClose}
            style={buttonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#fee2e2';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
            title="Fechar"
          >
            <X size={22} strokeWidth={1.5} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div style={scrollContainerStyle}>
          <div ref={contentRef}>
            {/* Single Page: Training Summary */}
            <div style={pageStyle}>
              <h1 style={titleStyle}>Treino - {session.day_name}</h1>
              <p style={subtitleStyle}>
                {(() => { const [y,m,d] = (session.date||'').split('-'); return d ? new Date(+y, +m-1, +d).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : ''; })()}
              </p>

              {/* Blocks */}
              {activeBlocks.length > 0 ? (
                activeBlocks.map((block) => {
                  const activity = block.activity;

                  return (
                    <div key={block.id} style={blockContainerStyle} className="avoid-break">
                      {/* Block Title - Header com fundo azul */}
                      <div style={blockTitleRowStyle}>
                        <span>{block.name}</span>
                        {activity.duration_minutes > 0 && (
                          <span style={durationBadgeStyle}>
                            {activity.duration_minutes} min
                          </span>
                        )}
                      </div>

                      {/* Two Columns Below Title (conditional based on description) */}
                      <div style={twoColumnsStyle}>
                        {/* Left Column: Info */}
                        <div style={activity.description ? leftColumnStyle : singleColumnStyle}>
                          {/* CONTEÚDOS PRIMEIRO */}
                          {activity.contents && activity.contents.length > 0 && (
                            <div style={fieldRowStyle}>
                              <span style={labelStyle}>Conteúdos:</span>
                              <span style={valueStyle}>{activity.contents.map(c => c.name).join(', ')}</span>
                            </div>
                          )}

                          {/* DEPOIS TEMA */}
                          {activity.title?.title && (
                            <div style={fieldRowStyle}>
                              <span style={labelStyle}>Tema:</span>
                              <span style={valueStyle}>{activity.title.title}</span>
                            </div>
                          )}

                          {activity.stages && activity.stages.length > 0 && (
                            <div style={fieldRowStyle}>
                              <span style={labelStyle}>Etapas:</span>
                              <span style={valueStyle}>{activity.stages.map(s => s.stage_name).join(', ')}</span>
                            </div>
                          )}

                          {activity.groups && activity.groups.length > 0 && (
                            <div style={fieldRowStyle}>
                              <span style={labelStyle}>Grupos:</span>
                              <span style={valueStyle}>{activity.groups.join(', ')}</span>
                            </div>
                          )}
                        </div>

                        {/* Right Column: Description - Only show if description exists */}
                        {activity.description && (
                          <div style={rightColumnStyle}>
                            <div style={observationsTitleStyle}>Descrição:</div>
                            <div style={observationsStyle}>
                              {activity.description}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af', fontSize: '14px' }}>
                  Nenhuma atividade cadastrada para este dia.
                </div>
              )}

              {/* Total Duration - MOVED TO BOTTOM */}
              <div style={totalDurationBoxStyle}>
                ⏱ Duração Total: {getTotalDuration()} minutos
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
