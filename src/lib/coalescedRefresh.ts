// One transaction can emit many row changes. Refresh once after that burst.
export function coalescedRefresh(callback: () => void, delay = 300) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return {
    schedule() {
      if (timer !== undefined) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = undefined;
        callback();
      }, delay);
    },
    cancel() {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
    },
  };
}