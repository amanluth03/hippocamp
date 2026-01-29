import React from "react";

const Privacy: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: January 2026</p>

        <div className="space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Introduction</h2>
            <p>
              Hippo Campus ("we", "our", or "us") is committed to protecting your privacy. 
              This Privacy Policy explains how we collect, use, and safeguard your information 
              when you use our mobile application and website.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Information We Collect</h2>
            <p className="mb-3">We collect the following types of information:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Account Information:</strong> When you sign in with Google, we receive 
                your name, email address, and profile picture.
              </li>
              <li>
                <strong>Photos and Media:</strong> Photos you upload to create memories or add 
                to events are stored securely on our servers.
              </li>
              <li>
                <strong>AI-Generated Data:</strong> We use artificial intelligence to analyze 
                your photos and generate searchable tags and descriptions. This processing 
                happens automatically to enable smart search features.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>To provide and maintain our service</li>
              <li>To enable photo storage, organization, and retrieval</li>
              <li>To power smart search functionality using AI-generated tags</li>
              <li>To authenticate your identity and secure your account</li>
              <li>To improve our services and user experience</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Data Storage and Security</h2>
            <p>
              Your photos and data are stored securely using Amazon Web Services (AWS) with 
              industry-standard encryption. We implement appropriate technical and organizational 
              measures to protect your personal information against unauthorized access, 
              alteration, disclosure, or destruction.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Data Sharing</h2>
            <p>
              We do not sell, trade, or rent your personal information to third parties. 
              Your photos are private and only accessible to you unless you choose to share them.
              We may use third-party services (such as AWS and Google OAuth) to operate our 
              service, but these providers are bound by their own privacy policies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Your Rights</h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access and download your photos and data</li>
              <li>Delete your photos, memories, or events at any time</li>
              <li>Delete your account and all associated data</li>
              <li>Request information about data we hold about you</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Data Retention</h2>
            <p>
              We retain your data for as long as your account is active. If you delete your 
              account, we will delete all your photos and personal data within 30 days, 
              except where we are required to retain it for legal purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Children's Privacy</h2>
            <p>
              Our service is not intended for children under 13 years of age. We do not 
              knowingly collect personal information from children under 13.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any 
              changes by posting the new Privacy Policy on this page and updating the 
              "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at:{" "}
              <a href="mailto:support@thehippocampus.net" className="text-purple-600 hover:underline">
                support@thehippocampus.net
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
