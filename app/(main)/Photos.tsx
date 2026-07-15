'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import React from 'react'

export function Photos({ photos }: { photos: string[] }) {
  const [width, setWidth] = React.useState(0)
  const [isCompact, setIsCompact] = React.useState(false)
  const expandedWidth = React.useMemo(() => width * 1.38, [width])

  React.useEffect(() => {
    const handleResize = () => {
      // Keep touch targets and photo proportions comfortable on phones/tablets.
      if (window.innerWidth < 1024) {
        setIsCompact(true)
        return setWidth(Math.min(280, Math.max(168, window.innerWidth * 0.62)))
      }

      setWidth(window.innerWidth / photos.length - 4 * photos.length)
    }

    window.addEventListener('resize', handleResize)
    handleResize()

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [photos.length])

  return (
    <motion.div
      className="mt-16 sm:mt-20"
      initial={{ opacity: 0, scale: 0.925, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        delay: 0.5,
        type: 'spring',
      }}
    >
      <div className="-my-4 flex w-full snap-x snap-proximity scroll-pl-5 justify-start gap-4 overflow-x-auto px-5 py-4 sm:gap-6 sm:px-8 lg:justify-center lg:overflow-x-hidden lg:px-0">
        {photos.map((image, idx) => (
          <motion.div
            key={idx}
            className="relative h-40 flex-none shrink-0 snap-start overflow-hidden rounded-xl bg-zinc-100 ring-2 ring-lime-800/20 dark:bg-zinc-800 dark:ring-lime-300/10 sm:h-56 sm:rounded-2xl lg:h-72 lg:rounded-3xl"
            animate={{
              width,
              opacity: isCompact ? 1 : 0.85,
              filter: isCompact ? 'grayscale(0)' : 'grayscale(0.5)',
              rotate: idx % 2 === 0 ? 2 : -1,
            }}
            whileHover={
              isCompact
                ? {}
                : {
                    width: expandedWidth,
                    opacity: 1,
                    filter: 'grayscale(0)',
                  }
            }
            layout
          >
            <Image
              src={image}
              alt=""
              width={500}
              height={500}
              sizes="(min-width: 1024px) 18rem, (min-width: 640px) 17.5rem, 62vw"
              className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
              priority
            />
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
