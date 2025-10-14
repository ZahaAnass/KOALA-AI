import { FaEnvelope, FaGithub, FaLinkedin } from 'react-icons/fa';
import './Contact.css';

function Contact() {
    return (
        <div className="min-h-screen p-6 flex flex-col items-center justify-center bg-[#12101b]">
            <div className="w-full max-w-6xl">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 text-center">Contact Us</h1>
                <p className="text-gray-300 text-lg mb-12 text-center max-w-2xl mx-auto">
                    Have questions about KOALA AI? We&apos;re here to help. Reach out through any of these channels.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Email Card */}
                    <div className="bg-[#2c2937] rounded-xl p-6 hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300 transform hover:-translate-y-1 flex flex-col items-center contact-card">
                        <div className="bg-purple-600/30 p-4 rounded-full mb-4 contact-icon-wrapper">
                            <FaEnvelope className="text-4xl text-purple-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-white mb-2">Email</h2>
                        <p className="text-gray-400 mb-4 text-center">For general inquiries and support</p>
                        <a 
                            href="mailto:zahaanass277@gmail.com" 
                            target="_blank"
                            rel='email'
                            className="text-purple-400 hover:text-purple-300 transition-colors duration-300 font-medium"
                        >
                            zahaanass277@gmail.com
                        </a>
                    </div>
                    
                    {/* GitHub Card */}
                    <div className="bg-[#2c2937] rounded-xl p-6 hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300 transform hover:-translate-y-1 flex flex-col items-center">
                        <div className="bg-purple-600/30 p-4 rounded-full mb-4">
                            <FaGithub className="text-4xl text-purple-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-white mb-2">GitHub</h2>
                        <p className="text-gray-400 mb-4 text-center">Check out our open source repositories</p>
                        <a 
                            href="https://github.com/Zahaanass" 
                            target="_blank" 
                            rel="github profile"
                            className="text-purple-400 hover:text-purple-300 transition-colors duration-300 font-medium"
                        >
                            github.com/Zahaanass
                        </a>
                    </div>
                    
                    {/* LinkedIn Card */}
                    <div className="bg-[#2c2937] rounded-xl p-6 hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300 transform hover:-translate-y-1 flex flex-col items-center">
                        <div className="bg-purple-600/30 p-4 rounded-full mb-4">
                            <FaLinkedin className="text-4xl text-purple-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-white mb-2">LinkedIn</h2>
                        <p className="text-gray-400 mb-4 text-center">Connect with us professionally</p>
                        <a 
                            href="https://www.linkedin.com/in/zaha-anas-101796334/" 
                            target="_blank" 
                            rel="github profile"
                            className="text-purple-400 hover:text-purple-300 transition-colors duration-300 font-medium"
                        >
                            linkedin.com/in/zahaanas
                        </a>
                    </div>
                </div>

                <div className="mt-16 text-center">
                    <h3 className="text-2xl font-bold text-white mb-4">Let&apos;s Build Together</h3>
                    <p className="text-gray-300 max-w-2xl mx-auto">
                        KOALA AI is constantly evolving. We appreciate your feedback and collaboration to make our AI assistant even better.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Contact;