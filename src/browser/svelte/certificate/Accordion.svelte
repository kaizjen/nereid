<style>
  img {
    filter: brightness(0.5);
    width: 18px;
    height: 18px;
    transition: .15s;
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
  <img src="n-res://dark/arrow.svg" class:rotated={open} alt="">
  <slot name="button" />
</button>

{#if open}
  <div>
    <slot name="content" />
  </div>
{/if}