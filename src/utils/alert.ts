import Swal, { SweetAlertOptions, SweetAlertIcon } from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

// Dark Theme Base Configuration for Wirecraft IDE
const baseDarkOptions: SweetAlertOptions = {
  background: '#0f172a', // Slate 900
  color: '#f8fafc', // Slate 50
  buttonsStyling: false,
  customClass: {
    popup: 'border border-slate-700 rounded-2xl shadow-2xl backdrop-blur-xl font-sans text-slate-100',
    title: 'text-slate-100 font-bold text-sm sm:text-base',
    htmlContainer: 'text-slate-300 text-xs leading-relaxed',
    confirmButton:
      'px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-sky-500/20 cursor-pointer mx-1.5',
    cancelButton:
      'px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs border border-slate-700 transition-all cursor-pointer mx-1.5',
    denyButton:
      'px-4 py-2 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-xl text-xs transition-all cursor-pointer mx-1.5',
  },
};

/**
 * Show a sleek dark-themed Toast notification at the top-right corner
 */
export const showToast = (
  icon: SweetAlertIcon = 'success',
  title: string,
  timer: number = 3000
) => {
  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer,
    timerProgressBar: true,
    background: '#0f172a',
    color: '#f8fafc',
    customClass: {
      popup:
        'border border-slate-700/80 rounded-xl shadow-2xl backdrop-blur-xl font-sans text-xs flex items-center gap-2 py-2.5 px-4',
      title: 'text-xs font-semibold text-slate-100',
    },
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    },
  });

  return Toast.fire({
    icon,
    title,
  });
};

/**
 * Show Confirmation Modal (e.g., delete, clear canvas, status toggle)
 */
export const showConfirm = async (options: {
  title: string;
  text?: string;
  icon?: SweetAlertIcon;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}): Promise<boolean> => {
  const {
    title,
    text,
    icon = 'warning',
    confirmText = 'Ya, Lanjutkan',
    cancelText = 'Batal',
    isDanger = false,
  } = options;

  const result = await Swal.fire({
    ...baseDarkOptions,
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    reverseButtons: true,
    customClass: {
      ...baseDarkOptions.customClass,
      confirmButton: isDanger
        ? 'px-4 py-2 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-rose-500/20 cursor-pointer mx-1.5'
        : 'px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-sky-500/20 cursor-pointer mx-1.5',
    },
  });

  return result.isConfirmed;
};

/**
 * Show Success Alert Modal
 */
export const showSuccess = (title: string, text?: string) => {
  return Swal.fire({
    ...baseDarkOptions,
    icon: 'success',
    title,
    text,
    confirmButtonText: 'Selesai',
  });
};

/**
 * Show Error Alert Modal
 */
export const showError = (title: string, text?: string) => {
  return Swal.fire({
    ...baseDarkOptions,
    icon: 'error',
    title,
    text,
    confirmButtonText: 'Mengerti',
    customClass: {
      ...baseDarkOptions.customClass,
      confirmButton:
        'px-4 py-2 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-xl text-xs transition-all cursor-pointer',
    },
  });
};

/**
 * Show Info Alert Modal
 */
export const showInfo = (title: string, text?: string) => {
  return Swal.fire({
    ...baseDarkOptions,
    icon: 'info',
    title,
    text,
    confirmButtonText: 'Tutup',
  });
};

/**
 * Show Warning Alert Modal
 */
export const showWarning = (title: string, text?: string) => {
  return Swal.fire({
    ...baseDarkOptions,
    icon: 'warning',
    title,
    text,
    confirmButtonText: 'Mengerti',
  });
};

export default Swal;
