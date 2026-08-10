// One place for the wording, because it appears on the catalogue card, the
// gallery card and the painting's own page — and the three saying slightly
// different things would read as three different promises.
export function editionLabel(isRepeatable: boolean): string {
  return isRepeatable ? 'Доступна для повтору' : 'Єдиний екземпляр';
}
