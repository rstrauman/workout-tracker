import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleInfo, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { ModalContext } from "../hooks/useModal";
import styles from "./ModalProvider.module.css";

function ModalProvider({ children }) {
    const [modal, setModal] = useState(null);
    const [inputValue, setInputValue] = useState("");
    const inputRef = useRef(null);
    const primaryBtnRef = useRef(null);

    const alertFn = useCallback((message, opts = {}) => {
        return new Promise((resolve) => {
            setModal({ type: "alert", message, opts, resolve });
        });
    }, []);

    const confirmFn = useCallback((message, opts = {}) => {
        return new Promise((resolve) => {
            setModal({ type: "confirm", message, opts, resolve });
        });
    }, []);

    const promptFn = useCallback((message, opts = {}) => {
        setInputValue(opts.defaultValue || "");
        return new Promise((resolve) => {
            setModal({ type: "prompt", message, opts, resolve });
        });
    }, []);

    const resolveAndClose = useCallback((result) => {
        setModal((current) => {
            current?.resolve(result);
            return null;
        });
    }, []);

    useEffect(() => {
        if (!modal) return;
        const target = modal.type === "prompt" ? inputRef.current : primaryBtnRef.current;
        target?.focus();

        const onKeyDown = (e) => {
            if (e.key === "Escape") {
                resolveAndClose(modal.type === "prompt" ? null : false);
            } else if (e.key === "Enter" && modal.type === "prompt") {
                resolveAndClose(inputValue.trim() || null);
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [modal, inputValue, resolveAndClose]);

    const handleBackdropClick = () => {
        if (!modal) return;
        resolveAndClose(modal.type === "prompt" ? null : false);
    };

    const handlePrimaryClick = () => {
        if (modal.type === "prompt") {
            resolveAndClose(inputValue.trim() || null);
        } else {
            resolveAndClose(true);
        }
    };

    const handleCancelClick = () => {
        resolveAndClose(modal.type === "prompt" ? null : false);
    };

    const contextValue = useMemo(
        () => ({ alert: alertFn, confirm: confirmFn, prompt: promptFn }),
        [alertFn, confirmFn, promptFn]
    );

    return (
        <ModalContext.Provider value={contextValue}>
            {children}
            {modal && (
                <div className={styles.overlay} onMouseDown={handleBackdropClick}>
                    <div className={styles.modalCard} onMouseDown={(e) => e.stopPropagation()}>
                        <div className={`${styles.iconBadge} ${modal.opts.danger ? styles.iconBadgeDanger : ""}`}>
                            <FontAwesomeIcon icon={modal.opts.danger ? faTriangleExclamation : faCircleInfo} />
                        </div>
                        <p className={styles.message}>{modal.message}</p>
                        {modal.type === "prompt" && (
                            <input
                                ref={inputRef}
                                className={styles.promptInput}
                                type="text"
                                value={inputValue}
                                placeholder={modal.opts.placeholder || ""}
                                onChange={(e) => setInputValue(e.target.value)}
                            />
                        )}
                        <div className={styles.actions}>
                            {modal.type !== "alert" && (
                                <button className={styles.cancelBtn} onClick={handleCancelClick}>
                                    {modal.opts.cancelLabel || "Cancel"}
                                </button>
                            )}
                            <button
                                ref={modal.type !== "prompt" ? primaryBtnRef : null}
                                className={`${styles.confirmBtn} ${modal.opts.danger ? styles.confirmBtnDanger : ""}`}
                                onClick={handlePrimaryClick}
                            >
                                {modal.opts.confirmLabel || (modal.type === "confirm" ? "Delete" : modal.type === "prompt" ? "Save" : "OK")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ModalContext.Provider>
    );
}

export default ModalProvider;
