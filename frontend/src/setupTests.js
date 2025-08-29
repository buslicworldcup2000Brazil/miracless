// Полифиллы для работы с Buffer в браузере
import { Buffer } from 'buffer';

// Добавляем Buffer в глобальный объект
global.Buffer = global.Buffer || Buffer;
window.Buffer = window.Buffer || Buffer;

// Добавляем process и другие Node.js глобальные объекты
global.process = global.process || {
  env: {},
  version: 'v16.0.0'
};

// Добавляем util глобальный объект
global.util = global.util || {
  TextEncoder: typeof TextEncoder !== 'undefined' ? TextEncoder : null,
  TextDecoder: typeof TextDecoder !== 'undefined' ? TextDecoder : null
};

export {};