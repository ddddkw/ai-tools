import { pool } from '../database';
import { AnalysisResult, CreateAnalysisResultDTO } from '../types';

export interface AnalysisData {
  summary: string;
  suggestedTasks: string[];
  estimatedComplexity: 'low' | 'medium' | 'high';
  suggestedPriority: 'low' | 'medium' | 'high';
}

export class AnalysisService {
  async createAnalysis(requirementId: string, data: AnalysisData): Promise<AnalysisResult> {
    const result = await pool.query(
      `INSERT INTO analysis_results (requirement_id, analysis)
       VALUES ($1, $2)
       RETURNING *`,
      [requirementId, JSON.stringify(data)]
    );
    return result.rows[0];
  }

  async findByRequirement(requirementId: string): Promise<AnalysisResult | null> {
    const result = await pool.query(
      `SELECT * FROM analysis_results WHERE requirement_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [requirementId]
    );
    return result.rows[0] || null;
  }

  async analyzeRequirement(requirementId: string): Promise<AnalysisData> {
    // Get requirement
    const reqResult = await pool.query('SELECT * FROM requirements WHERE id = $1', [requirementId]);
    if (reqResult.rows.length === 0) {
      throw new Error('Requirement not found');
    }
    const requirement = reqResult.rows[0];

    // Update status to analyzing
    await pool.query(
      `UPDATE requirements SET status = 'analyzing', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [requirementId]
    );

    // Call OpenAI API for analysis
    const analysisData = await this.callOpenAIAnalysis(requirement.title, requirement.content);

    // Save analysis result
    await pool.query(
      `INSERT INTO analysis_results (requirement_id, analysis) VALUES ($1, $2)`,
      [requirementId, JSON.stringify(analysisData)]
    );

    // Update status to analyzed
    await pool.query(
      `UPDATE requirements SET status = 'analyzed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [requirementId]
    );

    return analysisData;
  }

  private async callOpenAIAnalysis(title: string, content: string): Promise<AnalysisData> {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

    const prompt = `You are an expert software requirement analyst. Analyze the following requirement and provide a structured analysis.

Requirement Title: ${title}
Requirement Content:
${content}

Respond ONLY with valid JSON in this exact format (no markdown, no explanation):
{"summary":"2-3 sentence summary of the requirement","suggestedTasks":["task 1","task 2","task 3"],"estimatedComplexity":"low|medium|high","suggestedPriority":"low|medium|high"}`;

    try {
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data: any = await response.json();
      const text = data.choices?.[0]?.message?.content || '';

      // Try to parse JSON from response
      let analysisData: AnalysisData;
      try {
        // Try direct parse first
        analysisData = JSON.parse(text);
      } catch {
        // Try extracting JSON from text
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysisData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Failed to parse AI response');
        }
      }

      return {
        summary: analysisData.summary || 'Analysis completed.',
        suggestedTasks: Array.isArray(analysisData.suggestedTasks) ? analysisData.suggestedTasks : [],
        estimatedComplexity: ['low', 'medium', 'high'].includes(analysisData.estimatedComplexity)
          ? analysisData.estimatedComplexity : 'medium',
        suggestedPriority: ['low', 'medium', 'high'].includes(analysisData.suggestedPriority)
          ? analysisData.suggestedPriority : 'medium',
      };
    } catch (error) {
      // On error, update status back to draft
      await pool.query(
        `UPDATE requirements SET status = 'draft', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [requirementId]
      );
      throw error;
    }
  }
}

export const analysisService = new AnalysisService();
