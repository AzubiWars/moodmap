/**
 * Hält die kompakte MapLibre-Attribution eingeklappt (#175) – auf Mobile verdeckt sie sonst die Legende.
 * MapLibre klappt sie bei jeder Änderung des Attributionstexts wieder auf (`_updateCompact`), z. B. wenn
 * Quellen wie die Deutschland-Maske nach `load` nachladen. Ein Klick auf ⓘ bleibt möglich (Lizenzpflicht
 * dl-de/by-2-0): Er wird in der Capture-Phase erkannt, bevor MapLibre die Klasse umschaltet.
 */
export function keepAttributionCollapsed(mapContainer: HTMLElement): () => void {
  const attrib = mapContainer.querySelector<HTMLElement>('.maplibregl-ctrl-attrib');
  if (!attrib) return () => {};

  let userToggling = false;
  let userOpen = false;

  const collapse = () => {
    if (!userOpen && attrib.classList.contains('maplibregl-compact-show')) {
      attrib.classList.remove('maplibregl-compact-show');
    }
  };

  const onClickCapture = (event: Event) => {
    if ((event.target as HTMLElement | null)?.closest('.maplibregl-ctrl-attrib-button')) userToggling = true;
  };

  const observer = new MutationObserver(() => {
    if (userToggling) {
      userToggling = false;
      userOpen = attrib.classList.contains('maplibregl-compact-show');
      return;
    }
    collapse();
  });

  attrib.addEventListener('click', onClickCapture, true);
  observer.observe(attrib, { attributes: true, attributeFilter: ['class'] });
  collapse();

  return () => {
    observer.disconnect();
    attrib.removeEventListener('click', onClickCapture, true);
  };
}
