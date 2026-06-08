import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import SEOHead from '../../components/SEOHead';

interface PrivacyPolicyPageProps {
  onNavigate: (page: string) => void;
}

export default function PrivacyPolicyPage({ onNavigate }: PrivacyPolicyPageProps) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-black text-slate-300">
      <SEOHead 
        title="Privacy Policy | The Lockout Escape Room" 
        description="Privacy Policy for The Lockout Escape Room Dubai. Learn how we collect, use, and protect your personal information."
        fallbackTitle="Privacy Policy | The Lockout Escape Room"
      />
      
      {/* Navigation is rendered by App.tsx, but we include spacing for the fixed header */}
      <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <button 
          onClick={() => onNavigate('home')}
          className="mb-8 flex items-center text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </button>

        <div className="bg-slate-900 rounded-2xl p-8 md:p-12 border border-slate-800 shadow-xl">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-8 border-b border-slate-800 pb-6">
            Privacy Policy
          </h1>
          
          <div className="space-y-8 text-slate-300 leading-relaxed">
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">1. Introduction</h2>
              <p>
                The Lockout Escape Room ("we," "our," or "us") is committed to protecting your privacy. 
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website 
                (thelockout.ae), book a game, or interact with our services. Please read this privacy policy carefully. 
                If you do not agree with the terms of this privacy policy, please do not access the site.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">2. Information We Collect</h2>
              <p className="mb-4">
                We collect information that identifies, relates to, describes, references, is capable of being associated with, 
                or could reasonably be linked, directly or indirectly, with a particular consumer or device ("personal information").
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-white">Personal Identifiers:</strong> Name, email address, phone number, and booking details provided when you make a reservation.
                </li>
                <li>
                  <strong className="text-white">Payment Information:</strong> Transaction details and payment confirmation. We do not store full credit card numbers; payments are processed by secure third-party payment gateways.
                </li>
                <li>
                  <strong className="text-white">Technical Data:</strong> IP address, browser type, operating system, access times, and referring website addresses.
                </li>
                <li>
                  <strong className="text-white">Cookies and Tracking:</strong> We use cookies to enhance your experience, analyze site usage, and assist in our marketing efforts.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">3. How We Use Your Information</h2>
              <p>
                We may use the information we collect from you for the following purposes:
              </p>
              <ul className="list-disc pl-5 space-y-2 mt-4">
                <li>To process your bookings and manage your account.</li>
                <li>To communicate with you regarding your reservation, including confirmation emails and reminders.</li>
                <li>To send you newsletters, promotional materials, and other information (you can opt-out at any time).</li>
                <li>To improve our website, services, and customer experience.</li>
                <li>To comply with legal obligations and enforce our terms and conditions.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">4. Sharing Your Information</h2>
              <p>
                We do not sell, trade, or rent your personal identification information to others. We may share generic aggregated demographic information not linked to any personal identification information regarding visitors and users with our business partners, trusted affiliates, and advertisers. We may use third-party service providers to help us operate our business and the Site or administer activities on our behalf, such as sending out newsletters or surveys.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">5. Security of Your Information</h2>
              <p>
                We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">6. Third-Party Websites</h2>
              <p>
                The Site may contain links to third-party websites and applications of interest, including advertisements and external services, that are not affiliated with us. Once you have used these links to leave the Site, any information you provide to these third parties is not covered by this Privacy Policy, and we cannot guarantee the safety and privacy of your information.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">7. Changes to This Privacy Policy</h2>
              <p>
                We may update this Privacy Policy from time to time in order to reflect, for example, changes to our practices or for other operational, legal, or regulatory reasons. We will notify you of any changes by posting the new Privacy Policy on this page.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">8. Contact Us</h2>
              <p>
                If you have questions or comments about this Privacy Policy, please contact us at:
              </p>
              <div className="mt-4 p-4 bg-black/30 rounded-lg">
                <p><strong className="text-white">Email:</strong> info@thelockout.ae</p>
                <p><strong className="text-white">Phone:</strong> +971 50 367 8843</p>
                <p><strong className="text-white">Address:</strong> Street 3 - Al Qouz Ind. - Al Quoz - Dubai</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
