import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="hidden lg:block bg-white border-t border-gray-200 text-gray-600 text-xs mt-16">
      <div className="container max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Customer Support */}
          <div>
            <h3 className="font-semibold text-sm mb-4 text-gray-900">Chăm sóc khách hàng</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/help-center" className="hover:text-blue-500 transition-colors">
                  Trung tâm trợ giúp
                </Link>
              </li>
              <li>
                <Link href="/shipping" className="hover:text-blue-500 transition-colors">
                  Hướng dẫn mua hàng
                </Link>
              </li>
              <li>
                <Link href="/payment" className="hover:text-blue-500 transition-colors">
                  Thanh toán
                </Link>
              </li>
              <li>
                <Link href="/shipping" className="hover:text-blue-500 transition-colors">
                  Vận chuyển
                </Link>
              </li>
              <li>
                <Link href="/returns" className="hover:text-blue-500 transition-colors">
                  Trả hàng & Hoàn tiền
                </Link>
              </li>
            </ul>
          </div>

          {/* About */}
          <div>
            <h3 className="font-semibold text-sm mb-4 text-gray-900">Về Threads</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="hover:text-blue-500 transition-colors">
                  Giới thiệu về chúng tôi
                </Link>
              </li>
              <li>
                <Link href="/careers" className="hover:text-blue-500 transition-colors">
                  Tuyển dụng
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-blue-500 transition-colors">
                  Điều khoản
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-blue-500 transition-colors">
                  Chính sách bảo mật
                </Link>
              </li>
            </ul>
          </div>

          {/* Payment Methods */}
          <div>
            <h3 className="font-semibold text-sm mb-4 text-gray-900">Thanh toán</h3>
            <div className="flex flex-wrap gap-2">
              <div className="px-3 py-1.5 bg-gray-50 border border-gray-300 rounded text-xs text-gray-600 hover:border-gray-400 transition-colors">
                COD
              </div>
              <div className="px-3 py-1.5 bg-gray-50 border border-gray-300 rounded text-xs text-gray-600 hover:border-gray-400 transition-colors">
                VISA
              </div>
              <div className="px-3 py-1.5 bg-gray-50 border border-gray-300 rounded text-xs text-gray-600 hover:border-gray-400 transition-colors">
                ATM
              </div>
            </div>
          </div>

          {/* Follow Us */}
          <div>
            <h3 className="font-semibold text-sm mb-4 text-gray-900">Theo dõi chúng tôi</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-500 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Facebook
                </a>
              </li>
              <li>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-500 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                  Instagram
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 my-8" />

        {/* Copyright */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-text-tertiary">© {currentYear} Threads. Tất cả các quyền được bảo lưu.</p>
          <div className="flex gap-4 text-xs">
            <Link href="/privacy" className="text-text-secondary hover:text-primary-DEFAULT transition-colors">
              Chính sách bảo mật
            </Link>
            <span className="text-text-tertiary">|</span>
            <Link href="/terms" className="text-text-secondary hover:text-primary-DEFAULT transition-colors">
              Điều khoản sử dụng
            </Link>
            <span className="text-text-tertiary">|</span>
            <Link href="/sitemap" className="text-text-secondary hover:text-primary-DEFAULT transition-colors">
              Sitemap
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
