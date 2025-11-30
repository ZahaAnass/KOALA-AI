import { createContext, useContext, useState } from "react";

const UIContext = createContext();

export const UIProvider = ({ children }) => {
    const [showScrollButton, setShowScrollButton] = useState(true)

    return (
        <UIContext.Provider value={{ showScrollButton, setShowScrollButton }}>
            {children}
        </UIContext.Provider>
    );
};

export const useUI = () => useContext(UIContext);
