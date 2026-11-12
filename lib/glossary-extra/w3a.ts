import type { GlossaryDict } from '../glossary'

/**
 * Extra glossary terms owned by W3a (Uji strategi). Only that agent edits this file.
 * Same shape as lib/glossary.ts; keys must not exist in any other glossary
 * file (lib/glossary.test.ts fails on duplicates). Example:
 *
 *   export const GLOSSARY_EXTRA_W3A = {
 *     contoh_istilah: { label: 'Label', tip: 'Satu kalimat.', group: 'pasar' },
 *   } as const satisfies GlossaryDict
 */
export const GLOSSARY_EXTRA_W3A = {} as const satisfies GlossaryDict
