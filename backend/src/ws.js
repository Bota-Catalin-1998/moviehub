let wssInstance = null;

export function setWss(instance) {
  wssInstance = instance;
}

export function getWss() {
  return wssInstance;
}