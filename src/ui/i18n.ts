import i18n from '../i18n';

export function createTranslator() {
  return {
    t: i18n.t.bind(i18n),
    i18n,
  };
}
