<script lang="ts">
    import { Modal } from "@skeletonlabs/skeleton-svelte";
    import CityScene from "$lib/components/CityScene.svelte";
    import { isLoggedIn } from "$lib/api/auth.js";
    import { getCurrentUser } from "$lib/api/user.js";
    import LoginForm from "$lib/components/LoginForm.svelte";
    import { onMount } from "svelte";

    let modalState = $state(false);
    type ModalType = "login-asking" | "login-form";
    let modalType: ModalType = $state("login-asking");

    let user: any = $state(null);

    onMount(async () => {
        if (!isLoggedIn()) {
            modalType = "login-asking";
            modalState = true;
        } else {
            user = await getCurrentUser();
            if (!isLoggedIn()) {
                modalType = "login-asking";
                modalState = true;
            }
        }
    });

    const showLoginForm = () => {
        modalType = "login-form";
        modalState = true;
    };

    const runAsGuest = () => {
        user = {
            isGuest: true,
        };
    };

    const onLoggedIn = (result: any) => {
        modalState = false;
        if (!result) {
            runAsGuest();
        } else {
            user = result;
        }
    };
</script>

<main class="relative w-full h-screen">
    {#if user}
        <div class="fixed top-0 left-0 w-full h-full">
            <CityScene {user} />
        </div>
    {/if}
</main>

<Modal
    open={modalState}
    onOpenChange={(e) => (modalState = e.open)}
    contentBase="w-screen h-screen"
    backdropClasses="backdrop-blur-sm"
>
    {#snippet content()}
        <div class=" w-full h-full flex flex-col justify-center items-center">
            <div class="max-w-screen-sm">
                {#if modalType === "login-asking"}
                    {@render renderLoginAsking()}
                {:else if modalType === "login-form"}
                    <LoginForm {onLoggedIn}></LoginForm>
                {/if}
            </div>
        </div>
    {/snippet}
</Modal>

{#snippet renderLoginAsking()}
    <div class="card rounded-none bg-surface-50-950 shadow-xl space-y-4 p-4">
        <h2 class="text-xl font-semibold">You're not logged in</h2>
        <p class="text-muted-foreground">
            To get the best experience, we recommend logging in. But you can
            also continue as a guest if you prefer.
        </p>
        <div class="flex flex-col sm:flex-row gap-3 mt-4">
            <button
                class="btn preset-outlined-primary-500 flex-1 rounded-none"
                onclick={() => {
                    modalState = false;
                    runAsGuest();
                }}
            >
                Continue as Guest
            </button>
            <button
                class="btn preset-filled-primary-500 flex-1 rounded-none"
                onclick={showLoginForm}
            >
                Log In
            </button>
        </div>
    </div>
{/snippet}
