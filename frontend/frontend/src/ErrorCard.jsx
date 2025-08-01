import React from "react";

const ErrorCard = ({ type }) => {
  let message = "";

  switch (type) {
    case "too-many-passengers":
      message = "Too many passengers";
      break;
    case "too-many-drivers":
      message = "Too many drivers";
      break;
    case "no-passengers":
      message = "Please add at least one passenger";
      break;
    case "no-drivers":
      message = "Please add at least one driver";
      break;
    case "invalid-route":
      message = "Could not find a valid route";
      break;
    default:
      message = "An unknown error occurred";
  }
  return (
    <div className="flex flex-col gap-2 w-60 sm:w-72 text-[10px] sm:text-xs z-50">
      <div className="error-alert cursor-default flex items-center justify-between w-full h-12 sm:h-14 rounded-lg bg-[#232531] px-[10px]">
        <div className="flex gap-2">
          <div className="text-[#d65563] bg-white/5 backdrop-blur-xl p-1 rounded-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
              />
            </svg>
          </div>
          <div>
            <p className="text-white">Please try again</p>
            <p className="text-gray-500">{message}</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ErrorCard;
