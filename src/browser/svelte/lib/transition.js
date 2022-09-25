import * as easing from "svelte/easing";

export function appear(node, { delay = 0, duration = 400, easing: easing$1 = easing.cubicOut, x = 0, y = 0, opacity = 0, height = 0 } = {}) {
  const style = getComputedStyle(node);

  const target_opacity = +style.opacity;
  const transform = style.transform === 'none' ? '' : style.transform;
  const od = target_opacity * (1 - opacity);

  const oppositeHeight = 1 - height

  node.style.overflow = 'hidden';
  node.style.padding = '0';
  // Padding breaks the animation! The height will increase exponentially because of it! Use a wrapper for dialog padding.

  return {
      delay,
      duration,
      easing: easing$1,
      css: (_, u) => `
    transform: ${transform} translate(${u * x}px, ${u * y}px);
    opacity: ${target_opacity - (od * u)};`,
      tick(_, u) {
        node.style.height = (node.scrollHeight - ((node.scrollHeight * oppositeHeight) * u)) + 'px';
        if (u == 0) {
          node.style.height = '';
          node.style.overflow = '';
        }
      }
  };
}