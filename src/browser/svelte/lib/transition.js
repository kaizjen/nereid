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

  const finalHeight = node.getBoundingClientRect().height;

  return {
      delay,
      duration,
      easing: easing$1,
      css: (_, u) => `
    transform: ${transform} translate(${u * x}px, ${u * y}px);
    opacity: ${target_opacity - (od * u)};
    height: ${finalHeight - ((finalHeight * oppositeHeight) * u)}px`,
      tick(_, u) {
        if (u != 0) return;
        node.style.height = '';
        node.style.overflow = '';
      }
  };
}


export function modalPageAnimations(node, { animationControls, duration = 200, easing = 'ease-out' }) {
  let firstHeight;
  let lastHeight;
  let firstWidth;
  let lastWidth;

  animationControls.recordFirstSize = () => {
    firstHeight = node.getBoundingClientRect().height
    firstWidth = node.getBoundingClientRect().width
  }
  animationControls.recordLastSize = () => {
    lastHeight = node.getBoundingClientRect().height
    lastWidth = node.getBoundingClientRect().width
  }
  animationControls.setFirstSize = (rect) => {
    firstHeight = rect.height
    firstWidth = rect.width
  }
  animationControls.setLastSize = (rect) => {
    lastHeight = rect.height
    lastWidth = rect.width
  }
  animationControls.transition = () => {
    if (firstHeight == null || lastHeight == null)
      return console.warn("Error while creating animation - not all parameters were set")
        ;

    node.style.height = firstHeight + 'px';
    node.style.width = firstWidth + 'px';
    node.style.transition = `${easing} ${duration}ms`;
    node.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        node.style.height = lastHeight + 'px';
        node.style.width = lastWidth + 'px';
      })
    })
    setTimeout(() => {
      node.style.height = '';
      node.style.width = '';
      node.style.transition = '';
      node.style.overflow = '';
      firstHeight = null;
      lastHeight = null;
      firstWidth = null;
      lastWidth = null;
    }, duration + 10)
  }
}