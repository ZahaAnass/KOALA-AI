import { IKContext, IKUpload } from "imagekitio-react"
import { useRef } from "react"

const urlEndPoint = import.meta.env.VITE_IMAGE_KIT_END_POINT
const publicKey = import.meta.env.VITE_IMAGE_KIT_PUBLIC_KEY

const authenticator = async () => {
    try {
        const response = await fetch("http://localhost:3000/api/upload")

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Request failed with status ${response.status}: ${errorText}`)
        }

        const data = await response.json()

        const { signature, expire, token } = data

        return {
            signature,
            expire,
            token
        }

    } catch (error) {
        console.log(`Authenticator request failed: ${error.message}`)
    }
}


export const Upload = ({ setImg }) => {

    const ikUploadRef = useRef(null)

    const onError = err => {
        // console.log("Error", err);
    };
    
    const onSuccess = res => {
        // console.log("Success", res);
        setImg(prevImg => ({ ...prevImg, isLoading: false, dbData: res }))
    };
    
    const onUploadProgress = (progress) => {
        // console.log("Progress", progress);
    };
    
    const onUploadStart = evt => {
        const file = evt.target.files[0]

        const reader = new FileReader()
        reader.onloadend = () => {
            setImg(prevImg => ({ ...prevImg, isLoading: true, aiData: {
                inlineData:{
                    data: reader.result.split(",")[1],
                    mimeType: file.type,
                },
            } 
        }))
        }
        reader.readAsDataURL(file)
    };

    return (
        <IKContext
            authenticator={authenticator}
            urlEndpoint={urlEndPoint}
            publicKey={publicKey}
        >
            <IKUpload
                fileName="test-upload.png"
                onSuccess={onSuccess}
                onError={onError}
                useUniqueFileName={true}
                onUploadStart={onUploadStart}
                onUploadProgress={onUploadProgress}
                style={{ display: "none" }}
                ref={ikUploadRef}
            />
            {
                <label onClick={() => ikUploadRef.current.click()} htmlFor="file" className="rounded-[20px] bg-[#605e68] border-0 p-2.5 flex items-center justify-center cursor-pointer">
                    <img src="/attachment.png" alt="" className="w-4 h-4"/>
                </label>
            }
        </IKContext>
    )
}