import { useAuth } from "@clerk/clerk-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

export const DashboardPage = () => {
    const { getToken } = useAuth();
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const mutation = useMutation({
        mutationFn: async (text) => {
            const token = await getToken();
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chats`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ text })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.log('Error response: ', errorText);
                return;
            }

            const data = await response.json();
            return data;
        },
        onSuccess: ({ chatId }) => {
            queryClient.invalidateQueries({ queryKey: ['userChats'] });
            navigate(`/dashboard/chats/${chatId}`);
        }
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        const text = e.target.text.value;
        if (!text) return;

        mutation.mutate(text);
    };

    return (
        <div className="dashboardPage h-full flex flex-col items-center px-4 sm:px-6 lg:px-8 py-4">
            <div className="texts flex-1 flex flex-col items-center justify-center w-full sm:w-4/5 md:w-3/4 lg:w-2/3 xl:w-1/2 max-w-4xl">
                {/* Logo Section */}
                <div className="logo flex items-center gap-3 sm:gap-5 opacity-20 -mt-10 sm:-mt-20">
                    <img
                        src="/logo.png"
                        alt="logo"
                        className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16"
                    />
                    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl bg-gradient-to-r from-[#217bfe] to-[#e55571] bg-clip-text text-transparent font-bold">
                        KOALA AI
                    </h1>
                </div>

                {/* Options Cards */}
                <div className="options w-full mt-10 sm:mt-16 md:mt-20 flex flex-col sm:flex-row items-stretch justify-between gap-4 sm:gap-6 lg:gap-8 xl:gap-12">
                    <div className="option flex flex-col flex-1 gap-2 sm:gap-2.5 font-light text-sm p-4 sm:p-5 border-2 border-solid border-[#555] rounded-[20px] hover:border-[#217bfe] transition-all duration-300 cursor-pointer hover:scale-105">
                        <img
                            className="w-8 h-8 sm:w-10 sm:h-10 object-cover"
                            src="/chat.png"
                            alt="chat"
                        />
                        <span className="text-xs sm:text-sm">Create a New Chat</span>
                    </div>

                    <div className="option flex flex-col flex-1 gap-2 sm:gap-2.5 font-light text-sm p-4 sm:p-5 border-2 border-solid border-[#555] rounded-[20px] hover:border-[#e55571] transition-all duration-300 cursor-pointer hover:scale-105">
                        <img
                            className="w-8 h-8 sm:w-10 sm:h-10 object-cover"
                            src="/image.png"
                            alt="image"
                        />
                        <span className="text-xs sm:text-sm">Analyze Images</span>
                    </div>

                    <div className="option flex flex-col flex-1 gap-2 sm:gap-2.5 font-light text-sm p-4 sm:p-5 border-2 border-solid border-[#555] rounded-[20px] hover:border-[#217bfe] transition-all duration-300 cursor-pointer hover:scale-105">
                        <img
                            className="w-8 h-8 sm:w-10 sm:h-10 object-cover"
                            src="/code.png"
                            alt="contact"
                        />
                        <span className="text-xs sm:text-sm">Help me with my Code</span>
                    </div>
                </div>
            </div>

            {/* Form Container */}
            <div className="formContainer mt-auto w-full sm:w-4/5 md:w-3/4 lg:w-2/3 xl:w-1/2 max-w-4xl bg-[#2c2937] rounded-[20px] flex mb-4 sm:mb-6">
                <form
                    onSubmit={handleSubmit}
                    className="w-full h-full flex items-center justify-between gap-2 sm:gap-3 md:gap-5 p-1.5 sm:p-2"
                >
                    <input
                        name="text"
                        type="text"
                        placeholder="Ask me anything..."
                        disabled={mutation.isPending}
                        className="flex-1 p-3 sm:p-4 md:p-5 bg-transparent border-0 outline-none text-[#ececec] text-sm sm:text-base placeholder-gray-500 disabled:opacity-50"
                    />
                    <button
                        type="submit"
                        disabled={mutation.isPending}
                        className="bg-[#605e68] rounded-full border-0 cursor-pointer p-2 sm:p-2.5 flex items-center justify-center mr-2 sm:mr-3 md:mr-5 hover:bg-[#217bfe] transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px]"
                    >
                        {mutation.isPending ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <img
                                src="/arrow.png"
                                alt="arrow"
                                className="w-3 h-3 sm:w-4 sm:h-4"
                            />
                        )}
                    </button>
                </form>
            </div>

            {mutation.isError && (
                <div className="w-full sm:w-4/5 md:w-3/4 lg:w-2/3 xl:w-1/2 max-w-4xl mb-4">
                    <p className="text-red-500 text-sm text-center">
                        Failed to create chat. Please try again.
                    </p>
                </div>
            )}
        </div>
    );
};