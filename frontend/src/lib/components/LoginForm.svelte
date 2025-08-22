<script lang="ts">
    import { login, googleLogin, facebookLogin } from "$lib/api/auth.js";
    import { toaster } from "$lib/components/toaster.js";
    import { getCurrentUser } from "$lib/api/user.js";
    import { onMount } from "svelte";

    let { onLoggedIn } = $props();
    let username = $state("");
    let password = $state("");

    onMount(() => {
        setupGoogleLogin();
        setupFacebookLogin();
    });

    const setupFacebookLogin = () => {
        FB.init({
            appId: import.meta.env.VITE_FACEBOOK_BLOCKCITY_APP_ID,
            cookie: true,
            xfbml: false,
            version: "v21.0",
        });
    };

    const setupGoogleLogin = () => {
        window.google?.accounts.id.initialize({
            client_id: import.meta.env.VITE_GOOGLE_BLOCKCITY_CLIENT_ID,
            callback: handleGoogleCredentialResponse,
        });
        window.google?.accounts.id.renderButton(
            document.getElementById("googleBtn"),
            { theme: "outline", size: "large" },
        );
    };

    const handleLogin = async () => {
        try {
            if (username && password) {
                await login(username, password);
                const user = await getCurrentUser();
                onLoggedIn(user);
            } else {
                toaster.warning({
                    title: "Username or Password is invalid",
                });
            }
        } catch (exception) {
            console.log(exception);
            toaster.warning({
                title: "Login failed",
            });
        }
    };

    async function handleGoogleCredentialResponse(response: any) {
        try {
            const { clientId, credential } = response;
            if (clientId && credential) {
                await googleLogin(clientId, credential);
                const user = await getCurrentUser();
                onLoggedIn(user);
            } else {
                toaster.warning({
                    title: "Username or Password is invalid",
                });
            }
        } catch (exception) {
            console.log(exception);
            toaster.warning({
                title: "Login failed",
            });
        }
    }

    async function handleFacebookAuthResponse(response: any) {
        const accessToken = response.accessToken;
        if (accessToken) {
            await facebookLogin(accessToken);
            const user = await getCurrentUser();
            onLoggedIn(user);
        }
    }

    const loginWithFacebook = () => {
        FB.login(
            (response: any) => {
                if (response.authResponse) {
                    handleFacebookAuthResponse(response.authResponse);
                } else {
                    console.error("User cancelled login or not authorized");
                }
            },
            { scope: "public_profile,email" },
        );
    };

    const loginAsGuest = () => {
        onLoggedIn();
    };
</script>

<div class="w-full max-w-md mx-auto p-6 rounded-2xl shadow-xl bg-surface">
    <h2 class="text-xl font-semibold text-center mb-4 text-foreground">
        Login to Your Account
    </h2>

    <!-- Username -->
    <div class="mb-4">
        <label
            class="block text-sm font-medium text-muted-foreground mb-1"
            for="username"
        >
            Username
        </label>
        <input
            id="username"
            type="text"
            bind:value={username}
            class="input w-full"
            placeholder="Enter your username"
        />
    </div>

    <!-- Password -->
    <div class="mb-6">
        <label
            class="block text-sm font-medium text-muted-foreground mb-1"
            for="password"
        >
            Password
        </label>
        <input
            id="password"
            type="password"
            bind:value={password}
            class="input w-full"
            placeholder="Enter your password"
        />
    </div>

    <!-- Login button -->
    <button
        class="btn preset-filled-primary-500 w-full mb-4"
        onclick={handleLogin}
    >
        Log In
    </button>

    <!-- Divider -->
    <div class="flex items-center gap-2 mb-4">
        <div class="flex-1 h-px bg-border"></div>
        <div class="text-xs text-muted-foreground uppercase">Or</div>
        <div class="flex-1 h-px bg-border"></div>
    </div>

    <!-- Social login buttons -->
    <div class="w-full flex flex-col gap-3">
        <!-- <button
            class="disabled btn preset-outlined-primary-500 w-full flex items-center justify-center gap-2"
            onclick={loginWithGoogle}
        >
            <img src="/icons/google.svg" alt="Google" class="w-5 h-5" />
            Continue with Google
        </button> -->
        <div id="googleBtn"></div>

        <button
            class="btn preset-outlined-primary-500 w-full flex items-center justify-center gap-2"
            onclick={loginWithFacebook}
        >
            <img src="/icons/facebook.svg" alt="Facebook" class="w-5 h-5" />
            Sign in with Facebook
        </button>
        <button
            class="btn preset-outlined-primary-500 w-full flex items-center justify-center gap-2"
            onclick={loginAsGuest}
        >
            Continue as Guest
        </button>
    </div>
</div>
