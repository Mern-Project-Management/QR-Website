import React, { ReactNode } from "react";

interface PageTitleProps {
    title: string;
    subtitle?: string;
    children?: ReactNode;
}

const PageTitle: React.FC<PageTitleProps> = ({ title, subtitle, children }) => {
    return (
        <div className="px-3 py-5 sm:px-6 md:px-8 md:py-8">
            <div className="relative z-10 mx-auto flex w-full min-w-0 max-w-4xl flex-col items-center justify-center">
                <div className="animate-fade-in-up w-full min-w-0 text-center text-gray-900">
                    <h2 className="text-2xl font-semibold leading-tight tracking-tight break-words text-balance sm:text-3xl md:text-4xl lg:text-[2.75rem] lg:leading-tight">
                        {title}
                    </h2>
                    {subtitle && (
                        <p className="mt-2 max-w-2xl text-pretty text-base font-medium leading-relaxed text-gray-600 break-words md:text-lg">
                            {subtitle}
                        </p>
                    )}
                </div>
                {children && <div className="mt-4 w-full min-w-0 md:mt-5">{children}</div>}
            </div>
        </div>
    );
};

export default PageTitle;
