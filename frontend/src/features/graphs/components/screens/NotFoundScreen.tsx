import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  BarChart3,
  RefreshCw,
  TrendingUp,
  Clock,
  List,
  Search,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NotFoundScreen = () => {
  const navigate = useNavigate();
  return (
    <div className="relative flex items-center justify-center h-[100dvh] bg-gradient-to-br from-background via-muted/20 to-background overflow-hidden">
      {/* Grid Background */}
      <div
        className="absolute inset-0 opacity-[0.15] dark:opacity-[0.08]"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-primary/20"
            initial={{
              x:
                Math.random() *
                (typeof window !== 'undefined' ? window.innerWidth : 1200),
              y:
                Math.random() *
                (typeof window !== 'undefined' ? window.innerHeight : 800),
            }}
            animate={{
              y: [0, -100, 0],
              opacity: [0, 0.5, 0],
            }}
            transition={{
              duration: 4 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      <motion.div
        role="region"
        aria-labelledby="nf-title"
        className="relative w-full max-w-md mx-4"
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
      >
        <div className="p-8 text-center border-2 shadow-2xl rounded-2xl bg-card/95 backdrop-blur-xl border-border/50">
          {/* Icon with Animation */}
          <motion.div
            className="relative mx-auto mb-8"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', duration: 0.8, delay: 0.2 }}
          >
            <div className="relative flex items-center justify-center w-24 h-24 mx-auto border-2 rounded-full bg-gradient-to-br from-primary/10 to-accent/20 border-primary/20">
              <BarChart3 className="w-12 h-12 text-primary" />
            </div>
            <motion.div
              className="absolute rounded-full -inset-2 bg-primary/10 blur-xl -z-10"
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            {/* Floating mini icons */}
            <motion.div
              className="absolute -top-2 -right-2"
              animate={{
                y: [0, -10, 0],
                rotate: [0, 10, 0],
              }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            >
              <div className="p-2 rounded-lg bg-primary/20 backdrop-blur-sm">
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
            </motion.div>
          </motion.div>

          {/* Title & Description */}
          <motion.div
            className="space-y-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <h1
              id="nf-title"
              className="text-2xl font-bold text-transparent bg-gradient-to-r from-foreground via-primary to-foreground/70 bg-clip-text"
            >
              No Data Available
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Please select an instrument to view detailed charts and market
              data
            </p>
          </motion.div>

          {/* Suggestions */}
          <motion.div
            className="p-4 mt-6 border rounded-xl bg-muted/30 border-border/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center gap-2 mb-3 text-sm font-medium text-foreground">
              <Search className="w-4 h-4 text-primary" />
              <span>Quick Tips</span>
            </div>
            <div className="space-y-2.5 text-xs text-muted-foreground text-left">
              {[
                { icon: List, text: 'Pick a symbol from your watchlist' },
                { icon: Clock, text: 'Try a different timeframe' },
                { icon: RefreshCw, text: 'Refresh the page if issues persist' },
              ].map((tip, index) => (
                <motion.div
                  key={index}
                  className="flex items-center gap-2.5"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                >
                  <div className="flex-shrink-0 p-1.5 rounded-md bg-primary/10">
                    <tip.icon className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span>{tip.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            className="flex flex-col gap-2 mt-6 sm:flex-row"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Button
              onClick={() => navigate(-1)}
              className="flex-1 transition-all duration-300 shadow-lg h-11 bg-primary hover:bg-primary/90 hover:shadow-xl group"
            >
              <ArrowLeft className="w-4 h-4 mr-2 transition-transform duration-300 group-hover:-translate-x-1" />
              Go Back
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="flex-1 transition-all duration-300 h-11 border-border/50 hover:border-border group"
            >
              <RefreshCw className="w-4 h-4 mr-2 transition-transform duration-500 group-hover:rotate-180" />
              Reload
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFoundScreen;
