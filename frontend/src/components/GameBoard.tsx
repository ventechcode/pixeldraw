export default function GameBoard() {
    return (
        <div className="w-1/5 rounded-md border h-full flex flex-col">
            <h4 className="mb-4 text-lg text-center pt-2">Game Board</h4>
            <div className="p-4 flex-grow">
                <div className="space-y-3">
                    <div className="flex items-start">
                        <div
                            className="bg-gray-200 p-3 rounded-lg break-words"
                            style={{
                                wordBreak: "break-word",
                                hyphens: "auto",
                                width: "fit-content",
                                maxWidth: "100%",
                            }}
                        >
                            Game board content
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}