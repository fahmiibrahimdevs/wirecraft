import Swal, { SweetAlertOptions, SweetAlertIcon } from 'sweetalert2';

const baseDarkOptions: SweetAlertOptions = {
  background: '#0f172a',
  color: '#f8fafc',
  buttonsStyling: false,
  customClass: {
    confirmButton:
      'px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-sky-500/20 cursor-pointer mx-1.5',
    cancelButton:
      'px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs border border-slate-700 transition-all cursor-pointer mx-1.5',
    denyButton:
      'px-4 py-2 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-xl text-xs transition-all cursor-pointer mx-1.5',
  },
};

/**
 * Toast icon configurations with sharp SVG and glowing badges
 */
const TOAST_ICONS: Record<
  SweetAlertIcon,
  { svg: string; badgeClass: string; progressBar: string }
> = {
  success: {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`,
    badgeClass: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
    progressBar: '#10b981',
  },
  error: {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-rose-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
    badgeClass: 'bg-rose-500/15 border-rose-500/30 text-rose-400',
    progressBar: '#f43f5e',
  },
  warning: {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-amber-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    badgeClass: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
    progressBar: '#f59e0b',
  },
  info: {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-sky-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
    badgeClass: 'bg-sky-500/15 border-sky-500/30 text-sky-400',
    progressBar: '#0ea5e9',
  },
  question: {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-purple-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    badgeClass: 'bg-purple-500/15 border-purple-500/30 text-purple-400',
    progressBar: '#a855f7',
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
  const config = TOAST_ICONS[icon] || TOAST_ICONS.info;

  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
      const pb = toast.querySelector(
        '.swal2-timer-progress-bar'
      ) as HTMLElement | null;
      if (pb) {
        pb.style.backgroundColor = config.progressBar;
      }
    },
  });

  return Toast.fire({
    html: `
      <div class="flex items-center gap-3 w-full text-left py-0.5 select-none">
        <div class="w-7 h-7 rounded-lg flex items-center justify-center border shrink-0 ${config.badgeClass}">
          ${config.svg}
        </div>
        <div class="flex-1 min-w-0 pr-1">
          <p class="text-xs font-semibold text-slate-100 tracking-tight leading-snug truncate">
            ${title}
          </p>
        </div>
      </div>
    `,
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
