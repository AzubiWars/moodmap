import { keepAttributionCollapsed } from './attribution';

function setup() {
  const container = document.createElement('div');
  container.innerHTML =
    '<details class="maplibregl-ctrl-attrib maplibregl-compact"><summary class="maplibregl-ctrl-attrib-button"></summary></details>';
  document.body.append(container);
  const attrib = container.querySelector<HTMLElement>('.maplibregl-ctrl-attrib')!;
  const button = container.querySelector<HTMLElement>('.maplibregl-ctrl-attrib-button')!;
  // MapLibres eigener Toggle (Bubbling-Phase)
  button.addEventListener('click', () => attrib.classList.toggle('maplibregl-compact-show'));
  return { container, attrib, button };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('keepAttributionCollapsed (#175)', () => {
  it('collapses again when MapLibre re-opens the attribution', async () => {
    const { container, attrib } = setup();
    const stop = keepAttributionCollapsed(container);
    attrib.classList.add('maplibregl-compact-show'); // z. B. nach dem Laden der Deutschland-Maske
    await flush();
    expect(attrib.classList.contains('maplibregl-compact-show')).toBe(false);
    stop();
  });

  it('still lets people open and close it via the ⓘ button', async () => {
    const { container, attrib, button } = setup();
    const stop = keepAttributionCollapsed(container);
    button.click();
    await flush();
    expect(attrib.classList.contains('maplibregl-compact-show')).toBe(true);
    button.click();
    await flush();
    expect(attrib.classList.contains('maplibregl-compact-show')).toBe(false);
    stop();
  });
});
