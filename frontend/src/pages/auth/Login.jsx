export default function Login() {

    const handleGoogleLogin = () => {

        window.location.href =
            "http://127.0.0.1:8000/api/auth/google/";

    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100">

            <div className="bg-white p-10 rounded-xl shadow-lg w-[420px]">

                <h1 className="text-3xl font-bold text-center mb-3">
                    Email AI Assistant
                </h1>

                <p className="text-center text-gray-500 mb-8">
                    Sign in with your Google account
                </p>

                <button
                    onClick={handleGoogleLogin}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition"
                >
                    Continue with Google
                </button>

            </div>

        </div>
    );
}