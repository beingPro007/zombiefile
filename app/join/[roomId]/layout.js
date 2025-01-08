import { Footer } from '@/components/footer';
import React from 'react';

// The layout component should accept `children` prop and render it inside the layout
function Layout({ children }) {
    return (
        <div>
            <main>{children}</main>
            <Footer />
        </div>
    );
}

export default Layout;
