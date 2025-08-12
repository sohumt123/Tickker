'use client'

import { motion } from 'framer-motion'
import { Users, Target, Shield, Zap, Heart, Award, TrendingUp, Globe } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative py-24 px-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <img src="/icon.png" alt="Tickker" className="w-16 h-16 mx-auto mb-8" />
            <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6">
              About <span className="text-gradient">Tickker</span>
            </h1>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              We're building the future of social investing, where data-driven insights meet 
              collaborative learning to help everyone make better financial decisions.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center"
          >
            <div>
              <h2 className="text-4xl font-bold text-slate-900 mb-6">
                Our <span className="text-gradient">Mission</span>
              </h2>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                At Tickker, we believe that everyone deserves access to sophisticated investment 
                tools and insights. We're democratizing portfolio analysis and creating a 
                community where investors can learn from each other's successes and strategies.
              </p>
              <p className="text-lg text-slate-600 leading-relaxed">
                By combining powerful analytics with social features, we're helping investors 
                make more informed decisions while building a supportive community of 
                like-minded individuals.
              </p>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-8 text-white">
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center">
                    <TrendingUp className="w-8 h-8 mx-auto mb-4 text-blue-200" />
                    <div className="text-lg font-semibold mb-2">Portfolio Analytics</div>
                    <div className="text-blue-100">Advanced Performance Tracking</div>
                  </div>
                  <div className="text-center">
                    <Users className="w-8 h-8 mx-auto mb-4 text-purple-200" />
                    <div className="text-lg font-semibold mb-2">Social Trading</div>
                    <div className="text-blue-100">Community-Driven Insights</div>
                  </div>
                  <div className="text-center">
                    <Target className="w-8 h-8 mx-auto mb-4 text-indigo-200" />
                    <div className="text-lg font-semibold mb-2">Precision Tools</div>
                    <div className="text-blue-100">Data-Driven Decisions</div>
                  </div>
                  <div className="text-center">
                    <Shield className="w-8 h-8 mx-auto mb-4 text-green-200" />
                    <div className="text-lg font-semibold mb-2">Secure Platform</div>
                    <div className="text-blue-100">Bank-Level Security</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-24 px-4 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
              Our <span className="text-gradient">Values</span>
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              The principles that guide everything we do at Tickker.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Shield,
                title: "Security First",
                description: "Your financial data is protected with bank-level security and encryption.",
                color: "green"
              },
              {
                icon: Users,
                title: "Community Driven",
                description: "Building a supportive community where investors learn and grow together.",
                color: "blue"
              },
              {
                icon: Target,
                title: "Data Accuracy",
                description: "Providing precise, reliable analytics you can trust for important decisions.",
                color: "purple"
              },
              {
                icon: Heart,
                title: "User-Centric",
                description: "Every feature is designed with our users' success and experience in mind.",
                color: "pink"
              }
            ].map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ y: 50, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 ${
                  value.color === 'green' ? 'bg-green-100 text-green-600' :
                  value.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                  value.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                  'bg-pink-100 text-pink-600'
                }`}>
                  <value.icon size={28} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">{value.title}</h3>
                <p className="text-slate-600 leading-relaxed">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* CTA Section */}
      <section className="py-24 px-4 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Join the Future of Investing
            </h2>
            <p className="text-xl text-blue-100 mb-12 max-w-2xl mx-auto">
              Be part of a community that's changing how people think about investing and financial growth.
            </p>
            <motion.a
              href="/signup"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center gap-3 bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Join Tickker
              <TrendingUp className="w-5 h-5" />
            </motion.a>
          </motion.div>
        </div>
      </section>
    </div>
  )
}