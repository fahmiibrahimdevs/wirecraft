import { useCallback } from 'react';
import { toPng } from 'html-to-image';
import { CircuitComponent, Wire, CircuitProject } from '../types/circuit';
import { showToast, showConfirm, showError } from '../utils/alert';

interface UseProjectIOProps {
  projectName: string;
  components: CircuitComponent[];
  wires: Wire[];
  setProjectName: (name: string) => void;
  commit: (
    action:
      | { components: CircuitComponent[]; wires: Wire[] }
      | ((prev: { components: CircuitComponent[]; wires: Wire[] }) => {
          components: CircuitComponent[];
          wires: Wire[];
        }),
    ephemeral?: boolean
  ) => void;
  setSelectedComponentIds: (ids: string[]) => void;
  setSelectedWireId: (id: string | null) => void;
}

export function useProjectIO({
  projectName,
  components,
  wires,
  setProjectName,
  commit,
  setSelectedComponentIds,
  setSelectedWireId,
}: UseProjectIOProps) {
  // Export as PNG Diagram
  const handleExportPng = useCallback(async () => {
    try {
      const node = document.querySelector('svg') as unknown as HTMLElement;
      if (!node) return;

      const dataUrl = await toPng(node, {
        backgroundColor: '#020617',
        pixelRatio: 2,
      });

      const link = document.createElement('a');
      link.download = `${projectName.toLowerCase().replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
      showToast('success', 'Diagram rangkaian (PNG) berhasil diunduh!');
    } catch (err) {
      console.error('Failed to export PNG:', err);
      showError('Gagal Ekspor Gambar', 'Terjadi kesalahan saat mengekspor diagram rangkaian PNG.');
    }
  }, [projectName]);

  // Export JSON Project File
  const handleExportJson = useCallback(() => {
    const projectData: CircuitProject = {
      version: '1.0.0',
      id: `proj_${Date.now()}`,
      name: projectName,
      components,
      wires,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectName.toLowerCase().replace(/\s+/g, '_')}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('success', 'Berkas proyek (.json) berhasil diunduh!');
  }, [projectName, components, wires]);

  // Import JSON Project File
  const handleImportJson = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const parsed = JSON.parse(content);
          if (parsed.components && parsed.wires) {
            setProjectName(parsed.name || 'Proyek Diimpor');
            commit({
              components: parsed.components,
              wires: parsed.wires,
            });
            setSelectedComponentIds([]);
            setSelectedWireId(null);
            showToast('success', `Proyek "${parsed.name || file.name}" berhasil dimuat!`);
          } else {
            showError('Format Tidak Valid', 'Format file proyek JSON tidak valid atau struktur tidak dikenali.');
          }
        } catch (err) {
          showError('Gagal Membaca File', 'Tidak dapat memproses atau membaca file proyek JSON.');
        }
      };
      reader.readAsText(file);
    },
    [commit, setProjectName, setSelectedComponentIds, setSelectedWireId]
  );

  // Clear Canvas
  const handleClearCanvas = useCallback(async () => {
    const isConfirmed = await showConfirm({
      title: 'Bersihkan Seluruh Kanvas?',
      text: 'Semua kabel dan komponen yang ada di kanvas aktif akan dihapus.',
      icon: 'warning',
      confirmText: 'Ya, Bersihkan',
      cancelText: 'Batal',
      isDanger: true,
    });

    if (isConfirmed) {
      commit({
        components: [],
        wires: [],
      });
      setSelectedComponentIds([]);
      setSelectedWireId(null);
      showToast('info', 'Kanvas telah dibersihkan.');
    }
  }, [commit, setSelectedComponentIds, setSelectedWireId]);

  return {
    handleExportPng,
    handleExportJson,
    handleImportJson,
    handleClearCanvas,
  };
}
