import React from 'react';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
  color?: 'blue' | 'green' | 'blue' | 'red';
}

const Loader: React.FC<LoaderProps> = ({ 
  size = 'md', 
  text = 'Loading...', 
  className = '',
  color = 'blue'
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const barSizeClasses = {
    sm: 'w-1',
    md: 'w-1.5',
    lg: 'w-2'
  };

  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    blue: 'bg-blue-600',
    red: 'bg-red-600'
  };

  // Create 6 bars with different heights and animation delays
  const bars = [
    { height: '20%', delay: '0s' },
    { height: '40%', delay: '0.1s' },
    { height: '60%', delay: '0.2s' },
    { height: '80%', delay: '0.3s' },
    { height: '50%', delay: '0.4s' },
    { height: '30%', delay: '0.5s' }
  ];

  return (
    <>
      <style>{`
        @keyframes musicalBars {
          0%, 100% {
            transform: scaleY(0.3);
            opacity: 0.7;
          }
          50% {
            transform: scaleY(1);
            opacity: 1;
          }
        }
        .musical-bar {
          animation: musicalBars 1.2s ease-in-out infinite;
        }
      `}</style>
      
      <div className={`flex flex-col items-center justify-center space-y-4 ${className}`}>
        {/* Musical Bars Animation */}
        <div className={`flex items-end justify-center space-x-1 ${sizeClasses[size]}`}>
          {bars.map((bar, index) => (
            <div
              key={index}
              className={`${colorClasses[color]} rounded-full ${barSizeClasses[size]} musical-bar`}
              style={{
                height: bar.height,
                animationDelay: bar.delay,
              }}
            />
          ))}
        </div>
        
        {/* Loading Text */}
        {text && (
          <p className="text-sm text-gray-600 animate-pulse">
            {text}
          </p>
        )}
      </div>
    </>
  );
};

export default Loader;
