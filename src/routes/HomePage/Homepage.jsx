import { Link } from "react-router-dom"
import { TypeAnimation } from "react-type-animation"
import { useState } from "react"

export const HomePage = () => {

    const [typingStatus, setTypingStatus] = useState("Human1");

    return (
        <div className="homepage flex items-center xl:gap-[100px] h-full xl:flex-row lg:flex-col lg:gap-0">
            <img src="/orbital.png" alt="" className="absolute top-0 left-0 opacity-10 h-4/5"
                style={{animation: "var(--spin-animation)"}} />
            <div className="left flex-1 flex flex-col items-center justify-center gap-4 text-center">
                <h1 className="text-[128px] lg:text-6xl bg-gradient-to-r from-[#217bfe] to-[#e55571] bg-clip-text text-transparent">KOALA AI</h1>
                <h2 className="text-[24px] font-semibold">Supercharge your creativity and productivity</h2>
                <h3 className="font-normal max-w-3/4 lg:max-w-full">
                    Lorem ipsum dolor sit amet consectetur adipisicing elit. Unde soluta 
                    ipsam perferendis harum corporis nam! Quis, iure.
                </h3>
                <Link to="/dashboard" className="py-3.5 px-6 text-white bg-[#217bfe] rounded-2xl text-sm mt-5 hover:bg-white hover:text-[#217bfe] transition-colors">Get Started</Link>
            </div>
            <div className="right flex-1 flex items-center justify-center">
                <div className="imgContainer relative flex items-center justify-center bg-[#140e2d] rounded-[50px] w-4/5 h-1/2">
                    <div className="bgContainer w-full h-full overflow-hidden absolute top-0 left-0 rounded-[50px]">
                        <div className="bg bg-[url('/bg.png')] opacity-20 w-[200%] h-full bg-auto"
                            style={{animation: "var(--slide-animation)"}}></div>
                    </div>
                    <img src="/bot.png" alt="" className="w-full h-full object-contain "
                        style={{animation: "var(--bot-animation)"}}/>
                    <div className="chat absolute -bottom-8 -right-12 lg:right-0 xl:block lg:hidden flex items-center gap-2.5 p-5 bg-[#2c2937] rounded-[10px]">
                        <img src={typingStatus === "Human1" ? "/human1.jpeg" : typingStatus === "Human2" ? "/human2.jpeg" : typingStatus === "Bot" ? "/bot.png" : "/human1.jpeg"}
                            alt={typingStatus} className="w-8 h-8 rounded-[50px] object-cover"/>
                        <TypeAnimation
                            sequence={[
                                'Human: We produce food for Mice', 
                                2000, () => {
                                    setTypingStatus("Bot");
                                },
                                'Bot: We produce food for Hamsters', 
                                2000, () => {
                                    setTypingStatus("Human2");
                                },
                                'Human2: We produce food for Guinea Pigs',
                                2000, () => {
                                    setTypingStatus("Bot");
                                },
                                'Bot: We produce food for Chinchillas', 
                                2000
                            ]}
                            wrapper="span"
                            cursor={true}
                            repeat={Infinity}
                            omitDeletionAnimation={true}
                        />
                    </div>
                </div>
                <div className="terms absolute bottom-5 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-5">
                    <img src="/logo.png" alt="logo" className="w-4 h-4"/>
                    <div className="links flex text-[#BBB] gap-2.5 text-xs">
                        <Link to="/">Terms of Service</Link>
                        <span>|</span>
                        <Link to="/">Privacy Policy</Link>
                    </div>
                </div>
            </div>
        </div>
    )
}