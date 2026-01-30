import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';

interface AvatarProps {
    src?: string;
    name: string;
    size?: string; // Tailwind width/height classes, e.g., "w-10 h-10"
    className?: string; // Additional classes
    onClick?: () => void;
}

export const Avatar: React.FC<AvatarProps> = ({ src, name, size = "w-10 h-10", className = "", onClick }) => {
    const [hasError, setHasError] = useState(false);

    // Reset error state if src changes
    useEffect(() => {
        setHasError(false);
    }, [src]);

    const getInitials = (fullName: string) => {
        const names = fullName.trim().split(' ');
        if (names.length === 0) return '?';
        if (names.length === 1) return names[0].charAt(0).toUpperCase();
        return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
        // Or simply first letter as per user request "primeira letra"
        // return names[0].charAt(0).toUpperCase();
    };

    // Deterministic color based on name string
    const getColorFromName = (name: string) => {
        const colors = [
            'bg-red-500', 'bg-orange-500', 'bg-amber-500',
            'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
            'bg-cyan-500', 'bg-sky-500', 'bg-blue-500',
            'bg-indigo-500', 'bg-violet-500', 'bg-purple-500',
            'bg-fuchsia-500', 'bg-pink-500', 'bg-rose-500'
        ];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    const firstLetter = name ? name.charAt(0).toUpperCase() : '?';

    if (!src || hasError) {
        return (
            <div
                className={`${size} ${className} rounded-full flex items-center justify-center text-white font-bold shadow-sm ${getColorFromName(name)}`}
                onClick={onClick}
                title={name}
            >
                {firstLetter}
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={name}
            className={`${size} ${className} rounded-full object-cover shadow-sm`}
            onError={() => setHasError(true)}
            onClick={onClick}
        />
    );
};
