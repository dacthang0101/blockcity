<script lang="ts">
	import "../app.css";
	import { Toaster } from "@skeletonlabs/skeleton-svelte";
	import { toaster } from "$lib/components/toaster.js";

	let { children } = $props();
</script>

{@render children()}
<Toaster {toaster}></Toaster>
