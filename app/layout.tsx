import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Gemnad · Operations',description:'Your brands, content and creative team. One connected workspace.',icons:{icon:'/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
