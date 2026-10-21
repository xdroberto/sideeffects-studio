// @ts-check
/**
 * Field: la alegoría de la caverna (Platón, La República, libro VII) en la
 * traducción de Benjamin Jowett, de dominio público. Verificada párrafo por
 * párrafo contra la edición del MIT Classics Archive el 2026-10-21: 17
 * párrafos, con rayas tipográficas.
 *
 * Sin DOM para probarla con `node --test` (tests/node/playground-cave.test.mjs).
 */

export const CAVE_SOURCE = 'Plato, Republic, Book VII · tr. Benjamin Jowett'

/** @type {string[]} */
export const CAVE = [
  'And now, I said, let me show in a figure how far our nature is enlightened or unenlightened:—Behold! human beings living in an underground den, which has a mouth open towards the light and reaching all along the den; here they have been from their childhood, and have their legs and necks chained so that they cannot move, and can only see before them, being prevented by the chains from turning round their heads. Above and behind them a fire is blazing at a distance, and between the fire and the prisoners there is a raised way; and you will see, if you look, a low wall built along the way, like the screen which marionette players have in front of them, over which they show the puppets.',
  'I see.',
  'And do you see, I said, men passing along the wall carrying all sorts of vessels, and statues and figures of animals made of wood and stone and various materials, which appear over the wall? Some of them are talking, others silent.',
  'You have shown me a strange image, and they are strange prisoners.',
  'Like ourselves, I replied; and they see only their own shadows, or the shadows of one another, which the fire throws on the opposite wall of the cave?',
  'True, he said; how could they see anything but the shadows if they were never allowed to move their heads?',
  'And of the objects which are being carried in like manner they would only see the shadows?',
  'Yes, he said.',
  'And if they were able to converse with one another, would they not suppose that they were naming what was actually before them?',
  'Very true.',
  'And suppose further that the prison had an echo which came from the other side, would they not be sure to fancy when one of the passers-by spoke that the voice which they heard came from the passing shadow?',
  'No question, he replied.',
  'To them, I said, the truth would be literally nothing but the shadows of the images.',
  'That is certain.',
  'And now look again, and see what will naturally follow if the prisoners are released and disabused of their error. At first, when any of them is liberated and compelled suddenly to stand up and turn his neck round and walk and look towards the light, he will suffer sharp pains; the glare will distress him, and he will be unable to see the realities of which in his former state he had seen the shadows; and then conceive some one saying to him, that what he saw before was an illusion, but that now, when he is approaching nearer to being and his eye is turned towards more real existence, he has a clearer vision,—what will be his reply?',
  'And you may further imagine that his instructor is pointing to the objects as they pass and requiring him to name them,—will he not be perplexed? Will he not fancy that the shadows which he formerly saw are truer than the objects which are now shown to him?',
  'Far truer.',
]

/**
 * Parte una palabra que no cabe en la columna: después de cada raya y, si
 * aún no cabe, en trozos del ancho de la columna.
 * @param {string} word
 * @param {number} cols
 * @returns {string[]}
 */
function splitLong(word, cols) {
  if (word.length <= cols) return [word]
  // Sin lookbehind: Safari anterior a 16.4 no lo lee (playground-compat.test.mjs).
  const pieces = word
    .split('—')
    .map((p, i, all) => (i < all.length - 1 ? p + '—' : p))
    .filter(Boolean)
  return pieces.flatMap((p) => {
    const out = []
    for (let i = 0; i < p.length; i += cols) out.push(p.slice(i, i + cols))
    return out
  })
}

/**
 * Ajuste de renglones en una columna de `cols` caracteres (texto
 * monoespaciado): cada párrafo empieza renglón y ningún renglón rebasa la
 * columna. Una palabra más larga que la columna se corta sin agregar espacios.
 * @param {string[]} paragraphs
 * @param {number} cols
 * @returns {string[]}
 */
export function wrapLines(paragraphs, cols) {
  /** @type {string[]} */
  const lines = []
  for (const para of paragraphs) {
    let line = ''
    for (const word of para.split(' ').filter(Boolean)) {
      splitLong(word, cols).forEach((piece, k) => {
        // Los trozos de una misma palabra van pegados: el segundo y los
        // siguientes siempre empiezan renglón.
        if (line && k === 0 && line.length + 1 + piece.length <= cols) line += ' ' + piece
        else {
          if (line) lines.push(line)
          line = piece
        }
      })
    }
    if (line) lines.push(line)
  }
  return lines
}
