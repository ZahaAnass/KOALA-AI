import { useRef } from "react";
import { useEffect } from "react";

function NewPompt() {

  const endRef = useRef(null);

  useEffect(() => {
      endRef.current.scrollIntoView({ behavior: "smooth" });
  }, [])

  return (
    <>
      {/* ADD NEW CHAT */}
      <div className="endChat pb-24" ref={endRef}></div>
      <form className="newForm w-1/2 absolute bottom-0 bg-[#2c2937] rounded-[20px] flex items-center gap-5 py-0 px-5">
        <label htmlFor="file" className="rounded-[20px] bg-[#605e68] border-0 p-2.5 flex items-center justify-center cursor-pointer">
          <img src="/attachment.png" alt="" className="w-4 h-4"/>
        </label>
        <input id="file" type="file" multiple={false} hidden className="flex-1 p-5 border-0 outline-0 bg-transparent text-[#ececec]"/>
        <input type="text" placeholder="Ask anything" className="flex-1 p-5 border-0 outline-0 bg-transparent text-[#ececec]"/>
        <button className="rounded-[20px] bg-[#605e68] border-0 p-2.5 flex items-center justify-center cursor-pointer">
          <img src="/arrow.png" alt="" className="w-4 h-4"/>
        </button>
      </form>
    </>
  )
}

export default NewPompt