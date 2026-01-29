import React from "react";

const Support: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Support</h1>

        <div className="space-y-8 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Need Help?</h2>
            <p>
              We're here to help you get the most out of Hippo Campus. If you have any 
              questions, issues, or feedback, please don't hesitate to reach out.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Contact Us</h2>
            <p className="mb-4">
              Email us at:{" "}
              <a 
                href="mailto:support@thehippocampus.net" 
                className="text-purple-600 hover:underline font-medium"
              >
                support@thehippocampus.net
              </a>
            </p>
            <p>We typically respond within 24-48 hours.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Frequently Asked Questions</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900">How do I upload photos?</h3>
                <p className="text-gray-600 mt-1">
                  You can upload photos directly in the app by going to Memories or Events 
                  and tapping the upload button. On iOS, you can also share photos directly 
                  from your Photos app to Hippo Campus.
                </p>
              </div>

              <div>
                <h3 className="font-medium text-gray-900">How does Smart Search work?</h3>
                <p className="text-gray-600 mt-1">
                  Our AI automatically analyzes your photos and generates searchable tags. 
                  Simply type what you're looking for (like "beach" or "birthday party") 
                  and we'll find matching photos.
                </p>
              </div>

              <div>
                <h3 className="font-medium text-gray-900">Are my photos private?</h3>
                <p className="text-gray-600 mt-1">
                  Yes! Your photos are completely private and only accessible to you. 
                  We never share your photos with anyone unless you explicitly share them.
                </p>
              </div>

              <div>
                <h3 className="font-medium text-gray-900">How do I delete my account?</h3>
                <p className="text-gray-600 mt-1">
                  To delete your account and all associated data, please email us at 
                  support@thehippocampus.net with your request.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">App Version</h2>
            <p className="text-gray-600">Hippo Campus v1.0.0</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Support;
