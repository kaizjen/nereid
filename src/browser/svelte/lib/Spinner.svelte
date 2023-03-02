<style>
  .spinner {
    animation: spin 1s linear infinite;
    transform-origin: center;
  }

  circle.main {
    stroke-dasharray: 200px; /* {r} * 5 */
    animation: fancy 1.5s linear infinite;
    stroke-linecap: round;
    fill: none;
  }

  circle.small {
    stroke-dasharray: 0px 1000px;
    stroke-linecap: round;
    transform-origin: center;
    fill: none;
  }

  .a {
    animation: dot1 1.5s linear infinite;
  }
  .b {
    animation: dot2 1.5s linear infinite;
  }
  .c {
    animation: dot3 1.5s linear infinite;
  }

  @keyframes fancy {
    0% {
      stroke-dashoffset: 0px;
    }
    100% {
      stroke-dashoffset: -399px; /* {stroke-dasharray} * 2 - 1 */
    }
  }
  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  @keyframes dot1 {
    0% {
      transform: rotate(25deg);
    }
    25% {
      transform: rotate(120deg);
    }
    45% {
      transform: rotate(243deg);
    }
    79% {
      transform: rotate(380deg);
    }
    100% {
      transform: rotate(400deg);
    }
  }
  @keyframes dot2 {
    0% {
      transform: rotate(25deg);
    }
    25% {
      transform: rotate(100deg);
    }
    50% {
      transform: rotate(223deg);
    }
    89% {
      transform: rotate(370deg);
    }
    100% {
      transform: rotate(400deg);
    }
  }
  @keyframes dot3 {
    0% {
      transform: rotate(25deg);
    }
    25% {
      transform: rotate(80deg);
    }
    55% {
      transform: rotate(203deg);
    }
    99% {
      transform: rotate(360deg);
    }
    100% {
      transform: rotate(400deg);
    }
  }
</style>

<script>
  export let color = "var(--accent-5)";
  export let speedMultiplier = 1;

  export let { width, height } = { width: '50px', height: '50px' }

  export let thickness = 10;
  
  export let style = '';

  const dimensions = { cx: 50, cy: 50, r: 40 }
</script>

<svg viewbox="0 0 100 100" {width} {height} {style}>
  <g class="spinner" style:animation-duration={speedMultiplier}>
    <circle
     class="main" {...dimensions}
     stroke={color} style:animation-duration={1.5 * speedMultiplier}
     stroke-width={thickness + 'px'}
    />
    <circle
     class="small a" {...dimensions}
     stroke={color} style:animation-duration={1.5 * speedMultiplier}
     stroke-width={thickness - 1 + 'px'}
    />
    <circle
     class="small b" {...dimensions}
     stroke={color} style:animation-duration={1.5 * speedMultiplier}
     stroke-width={thickness - 1 + 'px'}
    />
    <circle
     class="small c" {...dimensions}
     stroke={color} style:animation-duration={1.5 * speedMultiplier}
     stroke-width={thickness - 1 + 'px'}
    />
  </g>
</svg>