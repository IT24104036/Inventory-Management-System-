export async function runWithState({
    setLoading,
    setError,
    task,
    getErrorMessage,
}) {
    setLoading(true);
    setError("");
    try {
        return await task();
    } catch (error) {
        const message = getErrorMessage ? getErrorMessage(error) : (error?.message || "Something went wrong.");
        setError(message);
        return null;
    } finally {
        setLoading(false);
    }
}
