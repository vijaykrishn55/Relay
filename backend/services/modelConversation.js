/**
 * Model Conversation Engine — : Hive Mind
 * 
 * Manages structured 2-model dialogues with turn limits,
 * convergence checking, and timeout enforcement.
 */

class ModelConversation {
  /**
   * @param {object}   modelA    - First model object (generator)
   * @param {object}   modelB    - Second model object (reviewer)
   * @param {object}   providerA - Provider instance for Model A
   * @param {object}   providerB - Provider instance for Model B
   * @param {object}   options
   * @param {number}   options.maxTurns         - Max conversation turns (default 3)
   * @param {boolean}  options.convergenceCheck  - Auto-stop on agreement (default true)
   * @param {number}   options.timeoutMs         - Max wall-clock time (default 30000)
   */
  constructor(modelA, modelB, providerA, providerB, options = {}) {
    this.modelA = modelA
    this.modelB = modelB
    this.providerA = providerA
    this.providerB = providerB
    this.maxTurns = options.maxTurns || 3
    this.convergenceCheck = options.convergenceCheck !== false
    this.timeoutMs = options.timeoutMs || 30000
    this.history = []
  }

  /**
   * Run a structured conversation between two models.
   * 
   * Turn 1: Model A generates initial output from the prompt.
   * Turn 2: Model B reviews/corrects using the review template.
   * Turn 3 (optional): Model A validates if B made significant changes.
   * 
   * @param {string} initialPromptForA   - Full prompt for Model A's first turn
   * @param {string} reviewPromptTemplate - Template for Model B (use ${modelA_output} placeholder)
   * @returns {{ finalOutput: string, turns: number, converged: boolean, history: Array }}
   */
  async converse(initialPromptForA, reviewPromptTemplate) {
    const startTime = Date.now()
    this.history = []

    try {
      // ── Turn 1: Model A generates ──
      console.log(`🔄 ModelConvo Turn 1: ${this.modelA.name} generating...`)
      const responseA = await this._callWithTimeout(
        this.providerA, this.modelA, initialPromptForA, startTime
      )

      this.history.push({
        turn: 1,
        model: this.modelA.name,
        modelId: this.modelA.id,
        role: 'generator',
        output: responseA.output,
        latency: responseA.latency
      })

      // ── Turn 2: Model B reviews ──
      console.log(`🔄 ModelConvo Turn 2: ${this.modelB.name} reviewing...`)
      const reviewPrompt = reviewPromptTemplate.replace(/\$\{modelA_output\}/g, responseA.output)
      const responseB = await this._callWithTimeout(
        this.providerB, this.modelB, reviewPrompt, startTime
      )

      this.history.push({
        turn: 2,
        model: this.modelB.name,
        modelId: this.modelB.id,
        role: 'reviewer',
        output: responseB.output,
        latency: responseB.latency
      })

      // Check convergence: if B made no significant changes, we're done
      if (this.convergenceCheck && this._hasConverged(responseA.output, responseB.output)) {
        console.log(`✅ ModelConvo converged at Turn 2 (no significant changes)`)
        return {
          finalOutput: responseB.output,
          turns: 2,
          converged: true,
          history: this.history
        }
      }

      // ── Turn 3 (optional): Model A validates corrections ──
      if (this.maxTurns >= 3) {
        // Check timeout before starting Turn 3
        if (Date.now() - startTime > this.timeoutMs * 0.8) {
          console.log(`⏱️ ModelConvo: Skipping Turn 3 due to timeout proximity`)
          return {
            finalOutput: responseB.output,
            turns: 2,
            converged: false,
            history: this.history
          }
        }

        console.log(`🔄 ModelConvo Turn 3: ${this.modelA.name} validating corrections...`)
        const validationPrompt = `You previously generated output for a task. Another AI reviewed and suggested corrections.
Compare both versions and produce the FINAL, best version.

YOUR ORIGINAL OUTPUT:
${responseA.output}

REVIEWER'S CORRECTIONS:
${responseB.output}

INSTRUCTIONS:
- Accept corrections that are valid improvements
- Keep your original work where it was already correct
- Resolve any conflicts by choosing the more accurate/complete version
- Return ONLY the final output in the exact same JSON format — no commentary`

        const responseA2 = await this._callWithTimeout(
          this.providerA, this.modelA, validationPrompt, startTime
        )

        this.history.push({
          turn: 3,
          model: this.modelA.name,
          modelId: this.modelA.id,
          role: 'validator',
          output: responseA2.output,
          latency: responseA2.latency
        })

        return {
          finalOutput: responseA2.output,
          turns: 3,
          converged: true,
          history: this.history
        }
      }

      return {
        finalOutput: responseB.output,
        turns: 2,
        converged: false,
        history: this.history
      }

    } catch (error) {
      console.error(`❌ ModelConvo error: ${error.message}`)

      // Return best available output from history
      if (this.history.length > 0) {
        const lastOutput = this.history[this.history.length - 1].output
        return {
          finalOutput: lastOutput,
          turns: this.history.length,
          converged: false,
          history: this.history,
          error: error.message
        }
      }

      throw error
    }
  }

  /**
   * Call a model with timeout enforcement.
   * @private
   */
  async _callWithTimeout(provider, model, prompt, conversationStartTime) {
    const elapsed = Date.now() - conversationStartTime
    const remaining = this.timeoutMs - elapsed

    if (remaining <= 0) {
      throw new Error(`ModelConversation timeout exceeded (${this.timeoutMs}ms)`)
    }

    // Race between model call and timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Model call timeout (${remaining}ms remaining)`)), remaining)
    )

    const modelPromise = provider.callModel(model, prompt)

    return Promise.race([modelPromise, timeoutPromise])
  }

  /**
   * Check if two outputs are functionally equivalent (converged).
   * @private
   */
  _hasConverged(outputA, outputB) {
    // Try JSON comparison (most model-to-model outputs are JSON)
    try {
      const a = JSON.parse(this._cleanJson(outputA))
      const b = JSON.parse(this._cleanJson(outputB))
      return JSON.stringify(a) === JSON.stringify(b)
    } catch {
      // Fall back to text comparison
      const cleanA = outputA.trim().replace(/\s+/g, ' ')
      const cleanB = outputB.trim().replace(/\s+/g, ' ')
      return cleanA === cleanB
    }
  }

  /**
   * Clean JSON strings from markdown fences.
   * @private
   */
  _cleanJson(str) {
    return str.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  }

  /**
   * Get the total latency of this conversation.
   */
  getTotalLatency() {
    return this.history.reduce((sum, entry) => sum + (entry.latency || 0), 0)
  }

  /**
   * Get the models that participated.
   */
  getModelsUsed() {
    return [...new Set(this.history.map(h => h.model))]
  }
}

module.exports = ModelConversation
