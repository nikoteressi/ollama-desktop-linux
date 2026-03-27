import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import MessageBubble from './MessageBubble.vue'
import { createPinia, setActivePinia } from 'pinia'

describe('MessageBubble.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })
  
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('renders user message correctly', () => {
    const wrapper = mount(MessageBubble, {
      props: {
        message: {
          role: 'user',
          content: 'Hello from user',
        }
      }
    })

    expect(wrapper.text()).toContain('Hello from user')
    expect(wrapper.find('.bg-blue-600').exists()).toBe(true)
  })

  it('renders assistant thinking block and CSS classes when isThinking is true', async () => {
    const wrapper = mount(MessageBubble, {
      props: {
        message: {
          role: 'assistant',
          content: 'Final answer',
        },
        isThinking: true,
        thinkingContent: 'Thought process here...'
      }
    })

    expect(wrapper.text()).toContain('Thinking...')
    expect(wrapper.text()).toContain('Thought process here...')
    const thinkingBox = wrapper.find('.animate-pulse.border-l-orange-500')
    expect(thinkingBox.exists()).toBe(true)
  })

  it('markdown throttling logic wraps the content nicely', async () => {
    const spyRequestAnimationFrame = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0)
      return 1
    })

    const wrapper = mount(MessageBubble, {
      props: {
        message: {
          role: 'assistant',
          content: '**Bolded Content**',
        }
      }
    })

    // Assert that the component scheduled a markdown render
    expect(spyRequestAnimationFrame).toHaveBeenCalled()

    await wrapper.vm.$nextTick()
    
    // Check if the html updated
    const htmlDiv = wrapper.find('.rendered-markdown')
    // Wait, the rendered text will contain 'Bolded Content' because `**` converts to `<strong>`
    expect(htmlDiv.html()).toContain('<strong>Bolded Content</strong>')
  })
})
