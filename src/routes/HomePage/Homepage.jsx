import { Link } from "react-router-dom"

export const HomePage = () => {

    return (
        <div className="homepage flex items-center gap-[100px] h-full">
            <img src="/orbital.png" alt="" className="absolute top-0 left-0 opacity-10"
                style={{animation: "var(--spin-animation)"}} />
            <div className="left flex-1 flex flex-col items-center justify-center gap-4 text-center">
                <h1 className="text-[128px] bg-gradient-to-r from-[#217bfe] to-[#e55571] bg-clip-text text-transparent">KOALA AI</h1>
                <h2 className="text-[24px] font-semibold">Supercharge your creativity and productivity</h2>
                <h3 className="font-normal max-w-3/4">
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
                </div>
            </div>
        </div>
    )
}