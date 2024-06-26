import * as easing from "svelte/easing";

export function appear(node, { delay = 0, duration = 400, easing: easing$1 = easing.cubicOut, x = 0, y = 0, opacity = 0, height = 0, isStatic = false } = {}) {
  const style = getComputedStyle(node);

  const target_opacity = +style.opacity;
  const transform = style.transform === 'none' ? '' : style.transform;
  const od = target_opacity * (1 - opacity);

  const oppositeHeight = 1 - height

  function getHeight() {
    const style = getComputedStyle(node);
    return node.getBoundingClientRect().height - parseFloat(style.borderTop) - parseFloat(style.borderBottom);
  }

  let finalHeight = getHeight();

  node.style.overflow = node.scrollHeight > node.getBoundingClientRect().height ? '' : 'hidden';
  node.style.padding = '0';
  // Padding breaks the animation! The height will increase exponentially because of it! Use a wrapper for dialog padding.
  requestAnimationFrame(() => {
    node.scrollTop = 0;
  })

  let finalHeightRecalculationTime = 0;
  let tickCounter = -1;

  return {
      delay,
      duration,
      easing: easing$1,
      css: (_, u) => `
    transform: ${transform} translate(${u * x}px, ${u * y}px);
    opacity: ${target_opacity - (od * u)};
    ${ !isStatic ? '' : `height: ${finalHeight - ((finalHeight * oppositeHeight) * u)}px;` }`,
      tick(_, u) {
        // When the content updates (and changes the height) while the animation is still playing,
        // this function would only animate the height to its value before the update.
        // The way to solve this is to recalculate finalHeight from time to time.
        // Here, we recalculate finalHeight every third frame (a balance between the
        // animation not looking jumpy and performance)
        // The variable `isStatic` also allows us to optimize this function by not doing
        // this calculation whenever it's not needed.
        tickCounter++;
        if (!isStatic && tickCounter % 3 == 0) {
          let perf1 = performance.now()
          node.style.height = '';
          finalHeight = getHeight();
          node.style.height = `${finalHeight - ((finalHeight * oppositeHeight) * u)}px`;
          finalHeightRecalculationTime += (performance.now() - perf1);
        }

        if (u != 0) return;
        node.style.height = '';
        node.style.overflow = '';
        if (!isStatic) console.log("finalHeightRecalculationTime: %oms", finalHeightRecalculationTime);
      }
  };
}

export function modalPageAnimations(node, { animationControls, duration = 200, easing = 'ease-out' }) {
  let firstHeight;
  let lastHeight;
  let firstWidth;
  let lastWidth;

  
  animationControls.setFirstSize = (rect) => {
    firstHeight = rect.height
    firstWidth = rect.width
  }
  animationControls.setLastSize = (rect) => {
    lastHeight = rect.height
    lastWidth = rect.width
  }
  animationControls.recordFirstSize = () => {
    animationControls.setFirstSize(node.getBoundingClientRect());
  }
  animationControls.recordLastSize = () => {
    animationControls.setLastSize(node.getBoundingClientRect());
  }
  animationControls.transition = () => {
    if (firstHeight == null || lastHeight == null)
      return console.warn("Error while creating animation - not all parameters were set")
    ;

    node.scrollTop = 0;

    node.style.height = firstHeight + 'px';
    node.style.width = firstWidth + 'px';
    node.style.transition = `${easing} ${duration}ms`;
    node.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      node.style.height = lastHeight + 'px';
      node.style.width = lastWidth + 'px';
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
    }, duration)
  }
}

export function widen(node, { delay = 0, duration = 800, easing: easing$1 = easing.cubicOut, opacity = 0, width = 0 } = {}) {
  const style = getComputedStyle(node);

  const oppositeWidth = 1 - width

  let finalWidth = node.getBoundingClientRect().width
    - parseFloat(style.borderLeft) - parseFloat(style.borderRight)
  ;

  if (duration != 0) {
    // If duration is 0, do nothing
    node.style.padding = '0';
    node.style.transition = '0s';
    node.style.opacity = opacity + '';
  }

  return {
    delay,
    duration: duration / 2,
    easing: easing$1,
    css: (_, u) => `
      width: ${finalWidth - ((finalWidth * oppositeWidth) * u)}px;
    `,
    tick(t) {
      if (t != 1) return;

      node.style.padding = '';
      setTimeout(() => {
        node.style.transition = '';
        node.style.opacity = '';
      }, duration)
    }
  };
}