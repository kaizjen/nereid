<style>
  img {
    filter: brightness(0.5);
    width: 18px;
    height: 18px;
    transition: cubic-bezier(0, 0.6, 0.23, 1.03) .15s;
  }
  .rotated {
    transform: rotate(90deg);
  }
  div {
    margin-left: 22px;
  }
  button {
    display: flex;
    align-items: center;
    margin-top: 8px;
    width: 100%;
  }
</style>
<script>
  export let open = false;
</script>

<button on:click={() => open = !open}>
  <img src="n-res://dark/chevron.svg" class:rotated={open} alt="">
  <slot name="button" />
</button>

{#if open}
  <div>
    <slot name="content" />
  </div>
{/if}