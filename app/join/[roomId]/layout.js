import { Footer } from '@/components/footer';
import React from 'react';

// The layout component should accept `children` prop and render it inside the layout
function Layout({ children }) {
    return (
        <div>
            {/* Render the children (content of the page) */}
            <main>{children}</main>

            {/* Footer component */}
            <Footer />
        </div>
    );
}

export default Layout;
