import type React from "react"

const GradientLoader: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/20">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24">
        <style jsx>{`
          @keyframes rotate {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
          
          .gradient-container {
            position: absolute;
            border-radius: 9999px;
            height: 100%;
            width: 100%;
          }
          
          .rotating-gradient {
            position: absolute;
            width: 100%;
            height: 100%;
            animation: rotate 1.2s linear infinite;
            border-radius: 9999px;
            background-color: #22d3ee;
            background-image: linear-gradient(#22d3ee, #0ea5e9, #2563eb);
          }
          
          .gradient-span {
            position: absolute;
            border-radius: 9999px;
            height: 100%;
            width: 100%;
            background-color: #22d3ee;
            background-image: linear-gradient(#22d3ee, #0ea5e9, #2563eb);
          }
          
          .blur-5 {
            filter: blur(5px);
          }
          
          .blur-10 {
            filter: blur(10px);
          }
          
          .blur-25 {
            filter: blur(25px);
          }
          
          .blur-50 {
            filter: blur(50px);
          }
          
          .rotating-gradient::after {
            content: "";
            position: absolute;
            top: 10px;
            left: 10px;
            right: 10px;
            bottom: 10px;
            background-color: #0f172a;
            border: solid 5px #0f172a;
            border-radius: 9999px;
          }

          .center-image {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 50px;
            height: 50px;
            z-index: 1;
            border-radius: 9999px;
          }
        `}</style>

        <div className="gradient-container">
          <div className="rotating-gradient">
            <span className="gradient-span blur-5"></span>
            <span className="gradient-span blur-10"></span>
            <span className="gradient-span blur-25"></span>
            <span className="gradient-span blur-50"></span>
          </div>
          <img 
            src="/logo/gtx.png" 
            alt="Loading" 
            className="center-image"
          />
        </div>
      </div>
    </div>
  )
}

export default GradientLoader