import type { GlossaryDict } from '../glossary'

/**
 * Extra glossary terms owned by W2a (Peluang koin). Only that agent edits this file.
 * Same shape as lib/glossary.ts; keys must not exist in any other glossary
 * file (lib/glossary.test.ts fails on duplicates). Example:
 *
 *   export const GLOSSARY_EXTRA_W2A = {
 *     contoh_istilah: { label: 'Label', tip: 'Satu kalimat.', group: 'pasar' },
 *   } as const satisfies GlossaryDict
 */
export const GLOSSARY_EXTRA_W2A = {} as const satisfies GlossaryDict
