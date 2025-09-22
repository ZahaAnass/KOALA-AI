import NewPompt from "../../componenets/NewPompt/NewPompt";
import "./ChatPage.css"

export const ChatPage = () => {

    return (
        <div className="chatPage h-full flex flex-col items-center relative">
            <div className="wrapper flex-1 w-full flex justify-center overflow-scroll">
                <div className="chat w-1/2 flex flex-col gap-5">
                    <div className="message">Test message from ai</div>
                    <div className="message user">Test message from user</div>
                    <div className="message">Test message from ai</div>
                    <div className="message user">Test message from user</div>
                    <div className="message">Test message from ai</div>
                    <div className="message user">Test message from user</div>
                    <div className="message">Test message from ai</div>
                    <div className="message user">Test message from user</div>
                    <div className="message">Test message from ai</div>
                    <div className="message user">Test message from user</div>
                    <div className="message">Test message from ai</div>
                    <div className="message user">Test message from user</div>
                    <div className="message">Test message from ai</div>
                    <div className="message user">Test message from user</div>
                    <div className="message">Test message from ai</div>
                    <div className="message user">Test message from user</div>
                    <div className="message">Test message from ai</div>
                    <div className="message user">Test message from user</div>
                    <div className="message">Test message from ai</div>
                    <div className="message user">Test message from user</div>
                    <div className="message">Test message from ai</div>
                    <div className="message user">Test message from user</div>
                    <div className="message">Test message from ai</div>
                    <div className="message user">Test message from user</div>
                    <div className="message">Test message from ai</div>
                    <div className="message user">Test message from user</div>
                    <div className="message">Test message from ai</div>
                    <NewPompt />
                </div>
            </div>
        </div>
    )
}